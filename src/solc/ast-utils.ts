import Ajv from 'ajv';
import util from 'util';
import astNodeSchema from 'solidity-ast/schema.json';
import { findAll } from 'solidity-ast/utils';
import {
  AnyNode,
  Node,
  ContractKind,
  ContractDefinition,
  ImportDirective,
  PragmaDirective,
  VariableDeclaration,
  FunctionDefinition,
  ModifierInvocation,
} from './ast-node';
import { Artifact } from './artifact';

import { WithSrc } from '../transformations/type';

const nodeSchemaValidator = new Ajv({ allErrors: true });
// eslint-disable-next-line @typescript-eslint/no-var-requires
nodeSchemaValidator.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

const isASTNode = nodeSchemaValidator.compile(astNodeSchema);

export function throwIfInvalidNode(node: AnyNode): void {
  if (!isASTNode(node)) {
    throw new Error(util.inspect(node) + ' is not a valid AST node.');
  }
}

export function isContractKind(node: ContractDefinition, kind: ContractKind): boolean {
  return node.contractKind === kind;
}

export function isInterface(node: ContractDefinition): boolean {
  return isContractKind(node, 'interface');
}

export function isContract(node: ContractDefinition): boolean {
  return isContractKind(node, 'contract');
}

export function isImportDirective(node: Node): node is ImportDirective {
  return node.nodeType === 'ImportDirective';
}

export function isVarDeclaration(node: Node): node is VariableDeclaration {
  return node.nodeType === 'VariableDeclaration';
}

export function isContractType(node: Node): node is ContractDefinition {
  return node.nodeType === 'ContractDefinition';
}

export function isPragmaDirective(node: Node): node is PragmaDirective {
  return node.nodeType === 'PragmaDirective';
}

export function isModifierInvocation(node: Node): node is ModifierInvocation {
  return node.nodeType === 'ModifierInvocation';
}

export function isContractDefinition(node: Node): node is ContractDefinition {
  return node.nodeType === 'ContractDefinition';
}

export function isFunctionDefinition(node: Node): node is FunctionDefinition {
  return node.nodeType === 'FunctionDefinition';
}

export function getSourceIndices(node: WithSrc): [number, number] {
  return node.src
    .split(':')
    .map(val => parseInt(val))
    .slice(0, 2) as [number, number];
}

export function getNodeSources(node: Node, source: string): [number, number, string] {
  const [start, len] = getSourceIndices(node);
  return [start, len, source.slice(start, start + len)];
}

export function getImportDirectives(node: Node): ImportDirective[] {
  return [...findAll('ImportDirective', node)];
}

export function getPragmaDirectives(node: Node): PragmaDirective[] {
  return [...findAll('PragmaDirective', node)];
}

export function getVarDeclarations(node: Node): VariableDeclaration[] {
  return [...findAll('VariableDeclaration', node)];
}

export function getContracts(node: Node): ContractDefinition[] {
  return [...findAll('ContractDefinition', node)];
}

export function getConstructor(node: ContractDefinition): FunctionDefinition | null {
  for (const fndef of findAll('FunctionDefinition', node)) {
    if (fndef.kind === 'constructor') {
      return fndef;
    }
  }
  return null;
}

export function getContract(art: Artifact): ContractDefinition {
  for (const contract of findAll('ContractDefinition', art.ast)) {
    if (contract.name === art.contractName) {
      return contract;
    }
  }
  throw new Error(`Can't find ${art.contractName} in ${util.inspect(art)}`);
}

export function getContractById(node: Node, id: number): ContractDefinition | null {
  for (const contract of findAll('ContractDefinition', node)) {
    if (contract.id === id) {
      return contract;
    }
  }
  return null;
}

export function stripBraces(source: string): string {
  return source.slice(1).slice(0, -1);
}
