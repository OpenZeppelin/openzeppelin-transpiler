import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';

import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* removeStateVarInits(
  sourceUnit: SourceUnit,
  { isExcluded }: TransformerTools,
): Generator<Transformation> {
  for (const varDecl of findAll('VariableDeclaration', sourceUnit, isExcluded)) {
    if (varDecl.stateVariable && varDecl.value && !varDecl.constant) {
      yield {
        ...getNodeBounds(varDecl),
        kind: 'purge-var-inits',
        transform: source => source.replace(/\s+=.*/, ''),
      };
    }
  }
}
