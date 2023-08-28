import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';
import { isStorageVariable } from './utils/is-storage-variable';

export function* removeStateVarInits(
  sourceUnit: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (hasConstructorOverride(contractNode)) {
      continue;
    }

    for (const varDecl of findAll('VariableDeclaration', contractNode)) {
      if (varDecl.value && isStorageVariable(varDecl, resolver)) {
        if (hasOverride(varDecl, 'state-variable-assignment', resolver)) {
          continue;
        }

        yield {
          ...getNodeBounds(varDecl),
          kind: 'purge-var-inits',
          transform: source => source.replace(/\s*=.*/s, ''),
        };
      }
    }
  }
}
