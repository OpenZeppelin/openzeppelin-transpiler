import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { NodeType, NodeTypeMap } from 'solidity-ast/node';

import { SolcOutput } from './solc/input-output';

export class ASTResolver {
  constructor(readonly output: SolcOutput) {}

  resolveContract(id: number): ContractDefinition | undefined {
    return this.resolveNode('ContractDefinition', id);
  }

  resolveNode<T extends NodeType>(nodeType: T, id: number): NodeTypeMap[T] | undefined {
    for (const source in this.output.sources) {
      for (const c of findAll(nodeType, this.output.sources[source].ast)) {
        if (c.id === id) {
          return c;
        }
      }
    }
  }
}
