import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { Node, NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

const scopedTypes: NodeType[] = ['ContractDefinition', 'StructDefinition', 'FunctionDefinition', 'VariableDeclaration'];

export class ASTResolver {
  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
  }

  resolveContract(id: number, recurse: boolean = false): ContractDefinition | undefined {
    while (1) {
      const node = this.resolveNode(scopedTypes, id, false);
      if (!node) {
        return undefined;
      }

      if (node.nodeType === 'ContractDefinition') {
          return node;
      } else if (!recurse || !("scope" in node)) {
        return undefined;
      } else {
        id = node.scope;
      }
    }
  }

  resolveNode<T extends NodeType>(nodeType: T | T[], id: number, doThrows:boolean = true): NodeTypeMap[T] | undefined {

    if (!Array.isArray(nodeType)) {
     nodeType = [nodeType];
    }

    for (const source in this.output.sources) {
      for (const c of findAll(nodeType, this.output.sources[source].ast)) {
        if (c.id === id) {
          if (this.exclude?.(source) && doThrows) {
            throw new Error(`Symbol was imported from an excluded file (${source})`);
          } else {
            return c;
          }
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
