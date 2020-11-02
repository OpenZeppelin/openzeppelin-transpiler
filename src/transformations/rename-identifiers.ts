import { SourceUnit, UserDefinedTypeName, Identifier } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract } from '../rename';
import { ContractResolver } from '../transform';

export function* renameIdentifiers(
  sourceUnit: SourceUnit,
  resolveContract: ContractResolver,
): Generator<Transformation> {
  for (const ident of findAllIdentifiers(sourceUnit)) {
    const ref = ident.referencedDeclaration;
    if (ref && resolveContract(ref)) {
      yield {
        kind: 'rename-identifiers',
        text: renameContract(ident.name),
        ...getNodeBounds(ident),
      };
    }
  }
}

function* findAllIdentifiers(contractNode: Node): Generator<UserDefinedTypeName | Identifier> {
  yield* findAll('UserDefinedTypeName', contractNode);
  yield* findAll('Identifier', contractNode);
}
