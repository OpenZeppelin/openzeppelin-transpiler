import {
  SourceUnit,
  ContractDefinition,
  InheritanceSpecifier,
  VariableDeclaration,
  FunctionDefinition,
  EventDefinition,
  ModifierDefinition,
  ModifierInvocation,
  Identifier,
  Literal,
  UserDefinedTypeName,
  ElementaryTypeName,
  ImportDirective,
  PragmaDirective,
  Block,
  ParameterList,
  OverrideSpecifier,
} from 'solidity-ast';

import { Node, NodeType } from 'solidity-ast/node';

export {
  SourceUnit,
  ContractDefinition,
  InheritanceSpecifier,
  VariableDeclaration,
  FunctionDefinition,
  EventDefinition,
  ModifierDefinition,
  ModifierInvocation,
  Identifier,
  Literal,
  UserDefinedTypeName,
  ElementaryTypeName,
  ImportDirective,
  PragmaDirective,
  Block,
  ParameterList,
  OverrideSpecifier,
  Node,
  NodeType,
};

export type ContractKind = ContractDefinition['contractKind'];

export type AnyNode = Node;
