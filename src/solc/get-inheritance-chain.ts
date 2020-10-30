import { ContractDefinition } from 'solidity-ast';

import { Artifact } from './artifact';

export function getInheritanceChain(
  contractNode: ContractDefinition,
  contractsToArtifactsMap: Record<number, Artifact | undefined>,
): Artifact[] {
  return contractNode.linearizedBaseContracts.map(base => {
    const baseArt = contractsToArtifactsMap[base];
    if (baseArt === undefined) {
      throw new Error(`One of the base artifacts for ${contractNode.name} is not available`);
    }
    return baseArt;
  });
}
