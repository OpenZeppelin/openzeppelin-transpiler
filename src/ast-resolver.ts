import { ContractDefinition } from 'solidity-ast';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';
import { NodeInfoResolver, NODEINFO } from 'solidity-ast/utils';

export class ASTResolver {
  private nodeInfoResolver: NodeInfoResolver;

  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
    this.nodeInfoResolver = new NodeInfoResolver(output);
  }

  resolveScope(id: number): NODEINFO | undefined {
    return this.nodeInfoResolver.getNodeInfo(id);
  }

  resolveContract(id: number): ContractDefinition | undefined {
    try {
      return this.resolveNode('ContractDefinition', id);
    } catch (e) {
      if (e instanceof ASTResolverError) {
        return undefined;
      } else {
        throw e;
      }
    }
  }

  resolveNode<T extends NodeType>(nodeType: T, id: number): NodeTypeMap[T] {
    const node = this.tryResolveNode(nodeType, id);
    if (node === undefined) {
      throw new ASTResolverError(nodeType);
    }
    return node;
  }

  tryResolveNode<T extends NodeType>(nodeType: T, id: number): NodeTypeMap[T] | undefined {
    const nodeInfo = this.resolveScope(id);
    let node = undefined;
    if (nodeInfo) {
      node = nodeInfo.node as NodeTypeMap[T];
      if (node && nodeType === (node.nodeType as T)) {
        if (this.exclude?.(nodeInfo.path)) {
          throw new Error(`Symbol #${id} was imported from an excluded file (${nodeInfo.path})`);
        }
      }
    }

    return node;
  }
}

export class ASTResolverError extends Error {
  constructor(nodeType: NodeType) {
    super(`Can't find required ${nodeType}`);
  }
}
