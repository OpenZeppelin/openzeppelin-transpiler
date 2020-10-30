import { getSourceIndices } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

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
