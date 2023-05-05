import { ContractDefinition } from 'solidity-ast';
import { findAll, astDereferencer, ASTDereferencer } from 'solidity-ast/utils';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export class ASTResolver {
  private deref: ASTDereferencer;

  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
    this.deref = astDereferencer(output);
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
    const { node, sourceUnit } = this.deref.withSourceUnit(nodeType, id);
    const source = sourceUnit.absolutePath;
    if (this.exclude?.(source)) {
      throw new Error(`Symbol #${id} was imported from an excluded file (${source})`);
    } else {
      return node;
    }
  }
}

export class ASTResolverError extends Error {
  constructor(nodeType: NodeType) {
    super(`Can't find required ${nodeType}`);
  }
}
