import { Artifact } from '../solc/artifact';
import { ContractDefinition } from '../solc/ast-node';
import { getSourceIndices, getVarDeclarations } from '../solc/ast-utils';
import { Transformation } from '../transformation';

// 100 slots of 32 contractSize each
const TARGET_SIZE = 32 * 50;

export function* addStorageGaps(
  artifact: Artifact,
  contractNode: ContractDefinition,
): Generator<Transformation> {
  if (contractNode.contractKind === 'contract') {
    const gapSize = getGapSize(artifact, contractNode);

    const lastNode = contractNode.nodes[contractNode.nodes.length - 1];
    const [contractNodeStart, contractNodeLength] = getSourceIndices(contractNode);

    const start = contractNodeStart + contractNodeLength - 1;
    const text = `\n    uint256[${gapSize}] private __gap;\n`;

    yield {
      kind: 'add-storage-gaps',
      start,
      end: start,
      text,
    };
  }
}

function getGapSize(
  artifact: Artifact,
  contractNode: ContractDefinition,
): number {
  const varIds = new Set(getVarDeclarations(contractNode).map(v => v.id));
  const layout = artifact.storageLayout;

  if (layout === undefined) {
    throw new Error('Storage layout is needed for this transformation');
  }

  const local = layout.storage.filter(l => varIds.has(l.astId));

  let contractSize = 0;

  for (const l of local) {
    const type = layout.types[l.type];
    if (type === undefined) {
      throw new Error(`Missing type information for ${type}`);
    }
    contractSize += parseInt(type.numberOfBytes, 10);
  }

  return Math.floor((TARGET_SIZE - contractSize) / 32);
}
