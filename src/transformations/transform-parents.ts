import { getNodeSources } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';
import { Artifact } from '../solc/artifact';
import { renameContract } from '../rename-contract';

export function transformParentsNames(
  contractNode: ContractDefinition,
  source: string,
  contracts: Artifact[],
): Transformation[] {
  const hasInheritance = contractNode.baseContracts.length;

  if (hasInheritance) {
    return contractNode.baseContracts
      .filter(base => contracts.map(o => o.contractName).includes(base.baseName.name))
      .map(base => {
        const [start] = getNodeSources(base.baseName, source);
        const [, len] = getNodeSources(base, source);

        return {
          kind: 'transform-parent-names',
          start: start,
          end: start + len,
          text: renameContract(base.baseName.name),
        };
      });
  } else return [];
}
