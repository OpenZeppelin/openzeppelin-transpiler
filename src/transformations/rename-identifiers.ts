import { SourceUnit } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract } from '../rename';
import { ASTResolver } from '../ast-resolver';
import { TransformerTools } from '../transform';

function* findAllIdentifiers(node: Node) {
  const seen = new Set();
  for (const id of findAll(['UserDefinedTypeName', 'IdentifierPath', 'Identifier'], node)) {
    if ('pathNode' in id && id.pathNode !== undefined) {
      seen.add(id.pathNode);
    }
    if (!seen.has(id)) {
      yield id;
    }
  }
}

export function* renameIdentifiers(
  sourceUnit: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  const candidates = getTransitiveRenameCandidates(sourceUnit, resolver);
  const rename = new Set(
    Object.keys(candidates).filter(
      name => resolver.resolveContract(candidates[name]) !== undefined,
    ),
  );

  for (const ident of findAllIdentifiers(sourceUnit)) {
    const ref = ident.referencedDeclaration;
    const contract = ref != null ? resolver.resolveContract(ref) : undefined;

    const identName = 'pathNode' in ident ? ident.pathNode?.name : ident.name;

    if (identName === undefined) {
      throw new Error('Unrecognized AST');
    }

    if (contract && rename.has(contract.name)) {
      yield {
        kind: 'rename-identifiers',
        text: renameContract(identName),
        ...getNodeBounds(ident),
      };
    } else if (identName.includes('.')) {
      const [ns] = identName.split('.', 1);
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
