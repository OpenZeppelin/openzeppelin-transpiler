import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getSourceIndices, getNodeBounds } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
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

export function* removeInheritanceListArguments(
  contractNode: ContractDefinition,
): Generator<Transformation> {
  for (const base of contractNode.baseContracts) {
    const [start, length] = getSourceIndices(base);
    yield {
      start,
      length,
      kind: 'transform-parent-names',
      transform: source => source.replace(/\(.*\)/, ''),
    };
  }
}
