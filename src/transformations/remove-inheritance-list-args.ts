import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';

// Removes inheritance arguments from contracts inheritance list, for example
// This: contract B is A(4) {
// Becomes this: contract B is A {
export function* removeInheritanceListArguments(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const base of findAll('InheritanceSpecifier', sourceUnit)) {
    yield {
      ...getNodeBounds(base),
      kind: 'remove-inheritance-arguments',
      transform: source => source.replace(/\(.*\)/, ''),
    };
  }
}
