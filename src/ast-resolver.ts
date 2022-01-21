import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { Node, NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';
import {WithSrc} from "./transformations/type";

const scopedTypes: NodeType[] = ['ContractDefinition', 'StructDefinition', 'FunctionDefinition', 'VariableDeclaration' ];

export class ASTResolver {
  constructor(readonly output: SolcOutput, readonly exclude?: (source: string) => boolean) {
  }

  resolveContract(id: number, recurse: boolean = false): ContractDefinition | undefined {
    let outOfScope = false;
    while (1) {
      let node;
      try {
        node = this.resolveNode(scopedTypes, id);
      } catch (e) {
        if (!(e instanceof ASTResolverError)) {
          throw e;
        }
        return undefined;
      }
      if (node.nodeType == 'ContractDefinition') {
        return node;
      } else if (!recurse || !("scope" in node)) {
        return undefined;
      } else {
        id = node.scope;
      }
    }
  }

  resolveNode<T extends NodeType>(nodeType: T | T[], id: number): NodeTypeMap[T] {

    if (!Array.isArray(nodeType)) {
     nodeType = [nodeType];
    }

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
  constructor(nodeType: NodeType | NodeType[]) {
    if (!Array.isArray(nodeType)) {
      nodeType = [nodeType];
    }
    super(`Can't find required ${nodeType.join(',')}`);
  }
}
