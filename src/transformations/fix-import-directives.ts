import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract, renamePath } from '../rename';
import { TransformerTools } from '../transform';

declare module '../transform' {
  interface TransformData {
    importFromPeer: string;
  }
}

export function fixImportDirectives(withPeerProject?: boolean) {
  return function* (
    ast: SourceUnit,
    { resolver, getData }: TransformerTools,
  ): Generator<Transformation> {
    for (const imp of findAll('ImportDirective', ast)) {
      const referencedSourceUnit = resolver.resolveNode('SourceUnit', imp.sourceUnit);

      if (withPeerProject && imp.symbolAliases.length == 0) {
        throw new Error(
          `Transpile with peer doesn't support import without aliases in ${imp.absolutePath}`,
        );
      }

      const imports: Record<string, string[]> = {};

      for (const a of imp.symbolAliases) {
        const id = referencedSourceUnit.exportedSymbols[a.foreign.name]?.[0];
        if (id === undefined) {
          throw new Error(`Can't find symbol imported in ${ast.absolutePath}`);
        }

        const contract = resolver.resolveContract(id);
        const importFromPeer = contract && getData(contract).importFromPeer;
        const importPath = importFromPeer ?? renamePath(imp.file);

        imports[importPath] ??= [];
        imports[importPath].push(
          [
            contract !== undefined && importFromPeer === undefined ? renameContract(a.foreign.name) : a.foreign.name,
            [null, undefined, a.foreign.name].includes(a.local) ? '' : ` as ${a.local}`,
          ].join(''),
        );
      }

      const statement = [];
      for (const [path, aliases] of Object.entries(imports)) {
        statement.push(`import {${aliases.join(', ')}} from "${path}";`);
      }
      if (imp.symbolAliases.length == 0) {
        statement.push(`import "${renamePath(imp.file)}";`);
      }

      yield {
        kind: 'fix-import-directives',
        text: statement.join('\n'),
        ...getNodeBounds(imp),
      };
    }
  };
}
