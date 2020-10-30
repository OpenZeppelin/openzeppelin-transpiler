import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';

export function* removeInheritanceListArguments2(
  sourceUnit: SourceUnit,
): Generator<Transformation> {
  for (const base of findAll('InheritanceSpecifier', sourceUnit)) {
    yield {
      ...getNodeBounds(base),
      kind: 'remove-inheritance-arguments',
      transform: source => source.replace(/\(.*\)/, ''),
    };
  }
}
