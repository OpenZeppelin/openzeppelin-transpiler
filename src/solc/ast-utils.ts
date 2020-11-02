import Ajv from 'ajv';
import util from 'util';
import astNodeSchema from 'solidity-ast/schema.json';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import { ContractDefinition, FunctionDefinition } from 'solidity-ast';

import { Bounds, WithSrc } from '../transformations/type';

const nodeSchemaValidator = new Ajv({ allErrors: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
nodeSchemaValidator.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const isASTNode = nodeSchemaValidator.compile(astNodeSchema);

export function throwIfInvalidNode(node: unknown): asserts node is Node {
  if (!isASTNode(node)) {
    throw new Error(util.inspect(node) + ' is not a valid AST node.');
  }
}

export function getNodeBounds(node: WithSrc): Bounds {
  const [start, length] = node.src.split(':', 2).map(val => parseInt(val));
  return { start, length };
}

export function getConstructor(node: ContractDefinition): FunctionDefinition | null {
  for (const fndef of findAll('FunctionDefinition', node)) {
    if (fndef.kind === 'constructor') {
      return fndef;
    }
  }
  return null;
}
