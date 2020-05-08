import { Artifact } from '../solc/artifact';
import { ContractDefinition, AnyNode, FunctionDefinition } from '../solc/ast-node';
import { getSourceIndices } from '../solc/ast-utils';
import { Transformation } from '../transformation';

type ArtifactsMap = {
  [N in number]?: Artifact;
};

export function* transformOverrides(
  contractNode: ContractDefinition,
  source: string,
  transpiled: Artifact[],
  artifactsMap: ArtifactsMap,
): Generator<Transformation> {
  const functions = contractNode.nodes.filter(isFunctionDefinition);

  for (const f of functions) {
    const overrides = f.overrides?.overrides;

    if (overrides) {
      for (const o of overrides) {
        const isTranspiled = transpiled.some(a => a === artifactsMap[o.referencedDeclaration]);

        if (isTranspiled) {
          const [start, len] = getSourceIndices(o);
          yield {
            kind: 'transform-overrides',
            start,
            end: start + len,
            text: o.name + 'Upgradeable',
          };
        }
      }
    }
  }
}

function isFunctionDefinition(node: AnyNode): node is FunctionDefinition {
  return node.nodeType === 'FunctionDefinition';
}