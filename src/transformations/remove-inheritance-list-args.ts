import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* removeInheritanceListArguments(
  sourceUnit: SourceUnit,
  { isExcluded }: TransformerTools,
): Generator<Transformation> {
  for (const base of findAll('InheritanceSpecifier', sourceUnit, isExcluded)) {
    yield {
      ...getNodeBounds(base),
      kind: 'remove-inheritance-arguments',
      transform: source => source.replace(/\(.*\)/, ''),
    };
  }
}
