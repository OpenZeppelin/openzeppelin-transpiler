import { ContractDefinition } from 'solidity-ast';
import {
  astDereferencer,
  ASTDereferencer,
  ASTDereferencerError,
  ExtendedNodeType,
  ExtendedNodeTypeMap,
  isNodeType,
} from 'solidity-ast/utils';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export class ASTResolver {
  private deref: ASTDereferencer;

  constructor(
    readonly output: SolcOutput,
    readonly exclude?: (source: string) => boolean,
  ) {
    this.deref = astDereferencer(output);
  }

  resolveContract(id: number): ContractDefinition | undefined {
    return this.tryResolveNode('ContractDefinition', id);
  }

  resolveNode<T extends ExtendedNodeType>(nodeType: T, id: number): ExtendedNodeTypeMap[T] {
    const { node, sourceUnit } = this.deref.withSourceUnit(nodeType, id);
    const source = sourceUnit.absolutePath;
    if (this.exclude?.(source)) {
      throw new Error(`Symbol #${id} was imported from an excluded file (${source})`);
    } else {
      return node;
    }
  }

  tryResolveNode<T extends NodeType>(nodeType: T, id: number): NodeTypeMap[T] | undefined {
    try {
      const node = this.resolveNode('*', id);
      if (isNodeType(nodeType, node)) {
        return node;
      }
    } catch (e) {
      if (e instanceof ASTDereferencerError) {
        return undefined;
      } else {
        throw e;
      }
    }
  }
}

export const ASTResolverError = ASTDereferencerError;
