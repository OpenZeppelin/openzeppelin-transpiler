import { SourceUnit, ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { getNodeBounds } from '../solc/ast-utils';
import { StorageLayout } from '../solc/input-output';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

// By default, make the contract a total of 50 slots (storage + gap)
const DEFAULT_SLOT_COUNT = 50;

function* execall(re: RegExp, text: string) {
  re = new RegExp(re, re.flags + (re.sticky ? '' : 'y'));
  while (true) {
    const match = re.exec(text);
    if (match && match[0] !== '') {
      yield match;
    } else {
      break;
    }
  }
}

export function* addStorageGaps(
  sourceUnit: SourceUnit,
  { getLayout }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    if (contract.contractKind === 'contract') {
      const doc =
        typeof contract.documentation === 'string'
          ? contract.documentation
          : contract.documentation?.text ?? '';

      let targetSlots = DEFAULT_SLOT_COUNT;
      for (const { groups } of execall(
        /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s@\w+)[^])*)/m,
        doc,
      )) {
        if (groups && groups.title === 'custom' && groups.tag === 'contract-size') {
          targetSlots = parseInt(groups.args);
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

function getContractSize(contractNode: ContractDefinition, layout: StorageLayout): number {
  const varIds = new Set([...findAll('VariableDeclaration', contractNode)].map(v => v.id));

  if (layout === undefined) {
    throw new Error('Storage layout is needed for this transformation');
  }

  const local = layout.storage.filter(l => varIds.has(l.astId));

  let contractSize = 0;

  for (const l of local) {
    const type = layout.types?.[l.type];
    if (type === undefined) {
      throw new Error(`Missing type information for ${type}`);
    }

    // size of current object
    const size = parseInt(type.numberOfBytes, 10);
    // used space in the current slot
    const used = contractSize % 32;
    // free space in the current slot (if any)
    const free = used > 0 ? 32 - used : 0;
    // if the free space is not enough to fit the current object, then consume the free space to start at next slot
    contractSize += (size > free ? free : 0) + size;
  }

  return contractSize;
}
