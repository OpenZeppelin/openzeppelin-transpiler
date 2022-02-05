import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { Node, NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export interface nodeInfo {
  path: string;
  scopeNode: Node | undefined;
  node: Node
}

export class ASTResolver {
  fastNodeLookup: Map<number, nodeInfo> = new Map<number, nodeInfo>();

  addChildNodes(path: string, scopeNode: Node, childNodes: Node[]) {
    for (const childNode of childNodes) {
      this.fastNodeLookup.set(childNode.id, {path, scopeNode, node: childNode });
      if ('nodes' in childNode) {
        this.addChildNodes(path, childNode, childNode.nodes);
      }
    }
  }

  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
    for (const source in this.output.sources) {
      const sUnit = this.output.sources[source].ast;
      this.fastNodeLookup.set(sUnit.id, { path: sUnit.absolutePath, scopeNode: undefined, node: sUnit});
      this.addChildNodes(sUnit.absolutePath, sUnit, sUnit.nodes);
    }
  }

  resolveScope(id: number): nodeInfo | undefined {
    return this.fastNodeLookup.get(id);
  }

  resolveContract(id: number) : ContractDefinition | undefined {
    const contract = this.fastNodeLookup.get(id)?.node as ContractDefinition;

    if (contract && contract.nodeType === 'ContractDefinition') {
      return contract;
    }

    return undefined;
  }

  resolveNode<T extends NodeType>(nodeType: T | T[], id: number, doThrows:boolean = true): NodeTypeMap[T] | undefined {

    if (!Array.isArray(nodeType)) {
      nodeType = [nodeType];
    }

    const nodeInfo = this.resolveScope(id);
    if (nodeInfo) {
      const node = nodeInfo.node as NodeTypeMap[T];
      if (nodeType.indexOf(node.nodeType as T) > -1 ) {
        if (this.exclude?.(nodeInfo.path) && doThrows) {
          throw new Error(`Symbol was imported from an excluded file (${nodeInfo.path})`);
        } else {
          return node;
        }
      }
    }

    if (doThrows) {
      throw new ASTResolverError(nodeType);
    } else {
      return undefined;
    }
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
