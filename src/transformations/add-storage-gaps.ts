import { SourceUnit, ContractDefinition } from 'solidity-ast';
import { findAll, isNodeType } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { hasOverride } from '../utils/upgrades-overrides';
import { getNodeBounds } from '../solc/ast-utils';
import { StorageLayout } from '../solc/input-output';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { extractNatspec } from '../utils/extractNatspec';

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
        if (entry.title === 'custom' && entry.tag === 'contract-size') {
          targetSlots = parseInt(entry.args);
        }
      }

      const contractSize = getContractSize(contract, getLayout(contract));
      const gapSize = Math.floor((32 * targetSlots - contractSize) / 32);

      const contractBounds = getNodeBounds(contract);
      const start = contractBounds.start + contractBounds.length - 1;

      const text = formatLines(0, [
        ``,
        [
          `/**`,
          ` * This empty reserved space is put in place to allow future versions to add new`,
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

function getNumberOfBytesOfValueType(type: string): number {
  let details;

  if (type === 't_bool') {
    return 1;
  }

  if (type === 't_byte') {
    return 1;
  }

  if (type === 't_address') {
    return 20;
  }

  if (details = type.match(/^t\_int(?<size>[\d]+)$/)) {
    return parseInt(details.groups?.size as string, 10) / 8; // size is [\d]+
  }

  if (details = type.match(/^t\_uint(?<size>[\d]+)$/)) {
    return parseInt(details.groups?.size as string, 10) / 8; // size is [\d]+
  }

  if (details = type.match(/^t\_bytes(?<size>[\d]+)$/)) {
    return parseInt(details.groups?.size as string, 10); // size is [\d]+
  }

  throw new Error(`unknown bas type ${type}`);
}

function getContractSize(contractNode: ContractDefinition, layout: StorageLayout): number {
  let contractSize = 0;

  // don't use `findAll` here, we don't want to go recursive
  for (const varDecl of contractNode.nodes.filter(isNodeType('VariableDeclaration'))) {
    if (varDecl.mutability === 'constant') continue;
    if (varDecl.mutability === 'immutable' && hasOverride(varDecl, 'state-variable-immutable')) continue;

    // try get type details
    const typeIdentifier = varDecl.typeDescriptions.typeIdentifier
      ?.replace('$_', '(')
      ?.replace('_$', ')');
    const type = layout.types?.[typeIdentifier || ''];

    // size of current object from type details, of alternativelly try to reconstruct it
    const size = type
      ? parseInt(type?.numberOfBytes, 10)
      : getNumberOfBytesOfValueType(typeIdentifier || '');

    // used space in the current slot
    const used = contractSize % 32;
    // free space in the current slot (if any)
    const free = used > 0 ? 32 - used : 0;
    // if the free space is not enough to fit the current object, then consume the free space to start at next slot
    contractSize += (size > free ? free : 0) + size;
  }

  return contractSize;
}
