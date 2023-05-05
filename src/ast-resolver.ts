import { ContractDefinition } from 'solidity-ast';
import { astDereferencer, ASTDereferencer, ASTDereferencerError } from 'solidity-ast/utils';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export class ASTResolver {
  private deref: ASTDereferencer;

  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
    this.deref = astDereferencer(output);
  }

  resolveContract(id: number): ContractDefinition | undefined {
    return this.tryResolveNode('ContractDefinition', id);
  }

  resolveNode<T extends NodeType>(nodeType: T, id: number): NodeTypeMap[T] {
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
      return this.resolveNode(nodeType, id);
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
