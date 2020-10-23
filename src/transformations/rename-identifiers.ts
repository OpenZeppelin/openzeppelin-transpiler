import { ContractDefinition, UserDefinedTypeName, Identifier } from 'solidity-ast';
import { findAll, isNodeType } from 'solidity-ast/utils';
import { Node } from 'solidity-ast/node';
import { getSourceIndices } from '../solc/ast-utils';
import { ArtifactsMap } from '../artifacts-map';
import { Transformation } from './type';
import { renameContract } from '../rename';

export function* renameIdentifiers(contractNode: ContractDefinition, artifactsMap: ArtifactsMap): Generator<Transformation> {
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

function* findAllIdentifiers(contractNode: ContractDefinition): Generator<UserDefinedTypeName | Identifier> {
  yield* findAll('UserDefinedTypeName', contractNode);
  yield* findAll('Identifier', contractNode);
}
