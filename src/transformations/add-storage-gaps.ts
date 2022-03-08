import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { Layout } from './utils/extract-layout';
import { getNodeBounds } from '../solc/ast-utils';
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
        if (entry.title === 'custom' && entry.tag === 'storage-size') {
          targetSlots = parseInt(entry.args);
        }
      }

      const layout = Layout.fromContract(contract, getLayout(contract));
      const gapSize = targetSlots - layout.moveToFreeSlot().getPosition().slot;

      if (gapSize > 0) {
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
      } else {
        throw new Error(
          `Contract ${contract.name} uses more then the ${targetSlots} reserved slots.`,
        );
      }
    }
  }
}
