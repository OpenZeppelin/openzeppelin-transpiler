import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';

export function* removeStateVarInits(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const varDecl of findAll('VariableDeclaration', sourceUnit)) {
    if (varDecl.stateVariable && varDecl.value && !varDecl.constant) {
      if (hasOverride(varDecl, 'state-variable-assignment')) {
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
