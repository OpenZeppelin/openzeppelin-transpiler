import { SourceUnit, UserDefinedTypeName, Identifier } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract } from '../rename';
import { ASTResolver } from '../ast-resolver';

export function* renameIdentifiers(
  sourceUnit: SourceUnit,
  resolver: ASTResolver,
): Generator<Transformation> {
  const candidates = getTransitiveRenameCandidates(sourceUnit, resolver);
  const rename = new Set(
    Object.keys(candidates).filter(c => resolver.resolveContract(candidates[c])),
  );

  for (const ident of findAllIdentifiers(sourceUnit)) {
    const ref = ident.referencedDeclaration;
    const contract = ref != null ? resolver.resolveContract(ref) : undefined;

    if (contract && rename.has(contract.name)) {
      yield {
        kind: 'rename-identifiers',
        text: renameContract(ident.name),
        ...getNodeBounds(ident),
      };
    } else if (ident.name.includes('.')) {
      const [ns] = ident.name.split('.', 1);
      if (rename.has(ns)) {
        yield {
          kind: 'rename-identifiers',
          transform: s => s.replace(ns, renameContract(ns)),
          ...getNodeBounds(ident),
        };
      }
    }
  }
}

function* findAllIdentifiers(contractNode: Node): Generator<UserDefinedTypeName | Identifier> {
  yield* findAll('UserDefinedTypeName', contractNode);
  yield* findAll('Identifier', contractNode);
}

function getTransitiveRenameCandidates(
  sourceUnit: SourceUnit,
  resolver: ASTResolver,
): Record<string, number> {
  const ex: Record<string, number> = {};

  for (const sym in sourceUnit.exportedSymbols) {
    const ids = sourceUnit.exportedSymbols[sym];
    if (ids) {
      ex[sym] = ids[0];
    }
  }

  for (const imp of findAll('ImportDirective', sourceUnit)) {
    const referencedSourceUnit = resolver.resolveNode('SourceUnit', imp.sourceUnit);
    if (referencedSourceUnit === undefined) {
      throw new Error(`Can't find source unit for ${imp.file}`);
    }
    const subexports = getTransitiveRenameCandidates(referencedSourceUnit, resolver);
    if (imp.symbolAliases.length === 0) {
      Object.assign(ex, subexports);
    } else {
      for (const { foreign, local } of imp.symbolAliases) {
        if (local == null || foreign.name === local) {
          ex[foreign.name] = subexports[foreign.name];
        }
      }
    }
  }

  return ex;
}
