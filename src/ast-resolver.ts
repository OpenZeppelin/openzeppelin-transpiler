import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export class ASTResolver {
  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {}

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
    for (const source in this.output.sources) {
      for (const c of findAll(nodeType, this.output.sources[source].ast)) {
        if (c.id === id) {
          if (this.exclude?.(source)) {
            throw new Error(`Symbol was imported from an excluded file (${source})`);
          } else {
            return c;
          }
        }
      }
    }

    throw new ASTResolverError(nodeType);
  }
}

export class ASTResolverError extends Error {
  constructor(nodeType: NodeType) {
    super(`Can't find required ${nodeType}`);
  }
}
