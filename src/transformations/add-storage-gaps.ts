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
import { parseTypeId } from '../utils/parse-type-id';
import { ASTResolver } from '../ast-resolver';
import { isStorageVariable } from './utils/is-storage-variable';

// By default, make the contract a total of 50 slots (storage + gap)
const DEFAULT_SLOT_COUNT = 50;

export function* addStorageGaps(
  sourceUnit: SourceUnit,
  { getLayout, resolver }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    if (contract.contractKind === 'contract') {
      let targetSlots = DEFAULT_SLOT_COUNT;
      for (const entry of extractNatspec(contract)) {
        if (entry.title === 'custom' && entry.tag === 'storage-size') {
          targetSlots = parseInt(entry.args);
        }
      }

      const gapSize = targetSlots - getContractSlotCount(contract, getLayout(contract), resolver);

      if (gapSize <= 0) {
        throw new Error(
          `Contract ${contract.name} uses more than the ${targetSlots} reserved slots.`,
        );
      }

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

function getNumberOfBytesOfValueType(typeId: string, resolver: ASTResolver): number {
  const { head, tail } = parseTypeId(typeId);
  const details = head.match(/^t_(?<base>[a-zA-Z]+)(?<size>\d+)?/);
  switch (details?.groups?.base) {
    case 'bool':
    case 'byte':
    case 'enum':
      return 1;
    case 'address':
    case 'contract':
      return 20;
    case 'bytes':
      return parseInt(details.groups.size, 10);
    case 'int':
    case 'uint':
      return parseInt(details.groups.size, 10) / 8;
    case 'userDefinedValueType': {
      const definition = resolver.resolveNode('UserDefinedValueTypeDefinition', Number(tail));
      const underlying = definition.underlyingType.typeDescriptions.typeIdentifier;
      if (underlying) {
        return getNumberOfBytesOfValueType(underlying, resolver);
      } else {
        throw new Error(`Unsupported value type: ${typeId}`);
      }
    }
    default:
      throw new Error(`Unsupported value type: ${typeId}`);
  }
}

function getContractSlotCount(
  contractNode: ContractDefinition,
  layout: StorageLayout,
  resolver: ASTResolver,
): number {
  // This tracks both slot and offset:
  // - slot   = Math.floor(contractSizeInBytes / 32)
  // - offset = contractSizeInBytes % 32
  let contractSizeInBytes = 0;

  // don't use `findAll` here, we don't want to go recursive
  for (const varDecl of contractNode.nodes.filter(isNodeType('VariableDeclaration'))) {
    if (isStorageVariable(varDecl, resolver)) {
      // try get type details
      const typeIdentifier = decodeTypeIdentifier(varDecl.typeDescriptions.typeIdentifier ?? '');

      // size of current object from type details, or try to reconstruct it if
      // they're not available try to reconstruct it, which can happen for
      // immutable variables
      const size =
        layout.types && layout.types[typeIdentifier]
          ? parseInt(layout.types[typeIdentifier]?.numberOfBytes ?? '')
          : getNumberOfBytesOfValueType(typeIdentifier, resolver);

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
