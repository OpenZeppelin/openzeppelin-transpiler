import { SourceUnit, ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { getNodeBounds } from '../solc/ast-utils';
import { StorageLayout } from '../solc/input-output';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

// 100 slots of 32 contractSize each
const TARGET_SIZE = 32 * 50;

export function* addStorageGaps(
  sourceUnit: SourceUnit,
  { getLayout }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    if (contract.contractKind === 'contract') {
      const gapSize = getGapSize(contract, getLayout(contract));

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

function getGapSize(contractNode: ContractDefinition, layout: StorageLayout): number {
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
    contractSize += parseInt(type.numberOfBytes, 10);
  }

  return Math.floor((TARGET_SIZE - contractSize) / 32);
}
