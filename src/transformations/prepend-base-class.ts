import { getNodeSources } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function* prependBaseClass(contractNode: ContractDefinition, source: string, cls: string): Generator<Transformation> {
  if (contractNode.contractKind !== 'contract') return;

  const hasInheritance = contractNode.baseContracts.length;

  const [start, , nodeSource] = getNodeSources(contractNode, source);

  const regExp = RegExp(`^(abstract\\s+)?contract\\s+${contractNode.name}(\\s+is)?`);

  const match = regExp.exec(nodeSource);
  if (!match) throw new Error(`Can't find ${contractNode.name} in ${nodeSource}`);

  yield {
    kind: 'prepend-base-class',
    start: start + match.index + match[0].length,
    length: 0,
    text: hasInheritance ? ` ${cls},` : ` is ${cls}`,
  };
}
