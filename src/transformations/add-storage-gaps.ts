import { SourceUnit, ContractDefinition, VariableDeclaration } from 'solidity-ast';
import { findAll, isNodeType } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { hasOverride } from '../utils/upgrades-overrides';
import { getNodeBounds } from '../solc/ast-utils';
import { StorageLayout } from '../solc/input-output';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { extractNatspec } from '../utils/extractNatspec';
import { decodeTypeIdentifier } from '../utils/type-id';

// By default, make the contract a total of 50 slots (storage + gap)
const DEFAULT_SLOT_COUNT = 50;

export function* addStorageGaps(
  sourceUnit: SourceUnit,
  { getLayout }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    if (contract.contractKind === 'contract') {
      let targetSlots = DEFAULT_SLOT_COUNT;
      for (const entry of extractNatspec(contract)) {
        if (entry.title === 'custom' && entry.tag === 'storage-size') {
          targetSlots = parseInt(entry.args);
        }
      }

      const gapSize = targetSlots - getContractSlotCount(contract, getLayout(contract));

      if (gapSize <= 0) {
        throw new Error(
          `Contract ${contract.name} uses more then the ${targetSlots} reserved slots.`,
        );
      } else {
        const contractBounds = getNodeBounds(contract);
        const start = contractBounds.start + contractBounds.length - 1;

        const text = formatLines(0, [
          ``,
          [
            `/**`,
            ` * @dev This empty reserved space is put in place to allow future versions to add new`,
            ` * variables without shifting down storage in the inheritance chain.`,
            ` * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps`,
            ` */`,
            `uint256[${gapSize}] private __gap;`,
          ],
        ]);

        yield {
          kind: 'add-storage-gaps',
          start,
          length: 0,
          text,
        };
      }
    }
  }
}

function isStorageVariable(varDecl: VariableDeclaration): boolean {
  switch (varDecl.mutability) {
    case 'constant':
      return false;
    case 'immutable':
      return !hasOverride(varDecl, 'state-variable-immutable');
    default:
      return true;
  }
}

function getNumberOfBytesOfValueType(type: string) {
  const details = type.match(/^t_(?<base>[a-z]+)(?<size>[\d]+)?$/);
  switch (details?.groups?.base) {
    case 'bool':
    case 'byte':
      return 1;
    case 'address':
      return 20;
    case 'bytes':
      return parseInt(details.groups.size, 10);
    case 'int':
    case 'uint':
      return parseInt(details.groups.size, 10) / 8;
    default:
      throw new Error(`Unsupported value type: ${type}`);
  }
}

function getContractSlotCount(contractNode: ContractDefinition, layout: StorageLayout): number {
  // This tracks both slot and offset:
  // - slot   = Math.floor(contractSizeInBytes / 32)
  // - offset = contractSizeInBytes % 32
  let contractSizeInBytes = 0;

  // don't use `findAll` here, we don't want to go recursive
  for (const varDecl of contractNode.nodes.filter(isNodeType('VariableDeclaration'))) {
    if (isStorageVariable(varDecl)) {
      // try get type details
      const typeIdentifier = decodeTypeIdentifier(varDecl.typeDescriptions.typeIdentifier ?? '');
      const type = layout.types?.[typeIdentifier];

      // size of current object from type details, or try to reconstruct it if
      // they're not available try to reconstruct it, which can happen for
      // immutable variables
      const size = type
        ? parseInt(type.numberOfBytes, 10)
        : getNumberOfBytesOfValueType(typeIdentifier);

      // used space in the current slot
      const offset = contractSizeInBytes % 32;
      // remaining space in the current slot (only if slot is dirty)
      const remaining = (32 - offset) % 32;
      // if the remaining space is not enough to fit the current object, then consume the free space to start at next slot
      contractSizeInBytes += (size > remaining ? remaining : 0) + size;
    }
  }

  return Math.ceil(contractSizeInBytes / 32);
}
