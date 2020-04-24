import { getContract } from './ast-utils';
import { Artifact } from './artifact';

export function getInheritanceChain(contract: string, contractsToArtifactsMap: Record<string | number, Artifact | undefined>): Artifact[] {
  const art = contractsToArtifactsMap[contract];

  if (art === undefined) {
    throw new Error(`Artifact for ${contract} is not available`);
  }

  const contractNode = getContract(art);

  return contractNode.linearizedBaseContracts.map(base => {
    const baseArt = contractsToArtifactsMap[base];
    if (baseArt === undefined) {
      throw new Error(`One of the base artifacts for ${contract} is not available`);
    }
    return baseArt;
  });
}
