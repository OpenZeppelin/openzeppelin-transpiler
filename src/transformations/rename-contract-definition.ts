import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { renameContract } from '../rename';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { matchBufferAt } from '../utils/match';

export function* renameContractDefinition(
  sourceUnit: SourceUnit,
  { originalSourceBuf }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    const bounds = getNodeBounds(contract);
    const re = /(?:abstract\s+)?(?:contract|library|interface)\s+([a-zA-Z0-9$_]+)/;
    const match = matchBufferAt(originalSourceBuf, re, bounds.start);

    if (!match) {
      throw new Error(`Can't find ${contract.name} in ${sourceUnit.absolutePath}`);
    }

    yield {
      ...match,
      kind: 'rename-contract-definition',
      transform: source => source.replace(/[a-zA-Z0-9$_]+$/, renameContract),
    };
  }
}
