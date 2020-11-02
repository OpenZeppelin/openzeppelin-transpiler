import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { renameContract } from '../rename';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';

export function* renameContractDefinition(
  sourceUnit: SourceUnit,
  _: unknown,
  original: string,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    const bounds = getNodeBounds(contract);
    const re = /(?:abstract\s+)?(?:contract|library|interface)\s+([a-zA-Z0-9$_]+)/y;
    re.lastIndex = bounds.start;
    const match = re.exec(original);

    if (match === null) {
      throw new Error(`Can't find ${contract.name} in ${sourceUnit.absolutePath}`);
    }

    yield {
      start: match.index,
      length: match[0].length,
      kind: 'rename-contract-definition',
      transform: source => source.replace(/[a-zA-Z0-9$_]+$/, renameContract),
    };
  }
}
