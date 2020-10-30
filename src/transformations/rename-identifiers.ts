import { SourceUnit, ContractDefinition, UserDefinedTypeName, Identifier } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import { getSourceIndices } from '../solc/ast-utils';
import { ArtifactsMap } from '../artifacts-map';
import { Transformation } from './type';
import { renameContract } from '../rename';
import { ContractResolver } from '../transform';

export function* renameIdentifiers2(
  sourceUnit: SourceUnit,
  resolveContract: ContractResolver,
): Generator<Transformation> {
  for (const ident of findAllIdentifiers(sourceUnit)) {
    const ref = ident.referencedDeclaration;
    if (ref && resolveContract(ref)) {
      const [start, length] = getSourceIndices(ident);
      yield {
        kind: 'rename-identifiers',
        start,
        length,
        text: renameContract(ident.name),
      };
    }
  }
}

export function* renameIdentifiers(
  contractNode: ContractDefinition,
  artifactsMap: ArtifactsMap,
): Generator<Transformation> {
  for (const ident of findAllIdentifiers(contractNode)) {
    const ref = ident.referencedDeclaration;
    if (ref && ref in artifactsMap) {
      const [start, length] = getSourceIndices(ident);
      yield {
        kind: 'rename-identifiers',
        start,
        length,
        text: renameContract(ident.name),
      };
    }
  }
}

function* findAllIdentifiers(contractNode: Node): Generator<UserDefinedTypeName | Identifier> {
  yield* findAll('UserDefinedTypeName', contractNode);
  yield* findAll('Identifier', contractNode);
}
