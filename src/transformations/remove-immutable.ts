import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';

export function* removeImmutable(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const varDecl of findAll('VariableDeclaration', sourceUnit)) {
    if (varDecl.mutability === 'immutable') {
      if (hasOverride(varDecl, 'state-variable-immutable')) {
        continue;
      }

      yield {
        ...getNodeBounds(varDecl),
        kind: 'remove-immutable',
        transform: source => source.replace(/\s+\bimmutable\b/, ''),
      };
    }
  }
}
