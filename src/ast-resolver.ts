import { ContractDefinition, SourceUnit } from 'solidity-ast';
import { Node, NodeType, NodeTypeMap } from 'solidity-ast/node';

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
    const contract = this.nodeInfoResolver.getNodeInfo(id)?.node as ContractDefinition;

    if (contract && contract.nodeType === 'ContractDefinition') {
      return contract;
    }

    return undefined;
  }

  resolveNode<T extends NodeType>(
    nodeType: T,
    id: number,
    doThrows = true,
  ): NodeTypeMap[T] | undefined {
    const node = this.tryResolveNode(nodeType, id, doThrows);
    if (node === undefined && doThrows) {
      throw new ASTResolverError(nodeType);
    }
    return node;
  }

  tryResolveNode<T extends NodeType>(
    nodeType: T,
    id: number,
    doThrows = true,
  ): NodeTypeMap[T] | undefined {

    const nodeInfo = this.resolveScope(id);
    if (nodeInfo) {
      const node = nodeInfo.node as NodeTypeMap[T];
      if (nodeType === node.nodeType as T) {
        if (this.exclude?.(nodeInfo.path) && doThrows) {
          throw new Error(`Symbol was imported from an excluded file (${nodeInfo.path})`);
        } else {
          return node;
        }
      } else {
        return undefined;
      }
    }

    return undefined;
  }
}

export class ASTResolverError extends Error {
  constructor(nodeType: NodeType | NodeType[]) {
    if (!Array.isArray(nodeType)) {
      nodeType = [nodeType];
    }
    super(`Can't find required ${nodeType.join(',')}`);
  }
}
