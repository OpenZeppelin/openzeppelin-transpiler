import { getNodeSources } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function transformContractName(
  contractNode: ContractDefinition,
  source: string,
  newName: string,
): Transformation {
  const [start, , nodeSource] = getNodeSources(contractNode, source);

  const subStart = nodeSource.indexOf(contractNode.name);
  if (subStart === -1) throw new Error(`Can't find ${contractNode.name} in ${nodeSource}`);

  return {
    kind: 'transform-contract-name',
    start: start + subStart,
    length: contractNode.name.length,
    text: newName,
  };
}
