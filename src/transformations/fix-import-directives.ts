import { Identifier, SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract, renamePath } from '../rename';
import { TransformerTools } from '../transform';

export function fixImportDirectives(withPeerProject?: boolean) {
  return function* (ast: SourceUnit, { resolver, getData }: TransformerTools): Generator<Transformation> {
    for (const imp of findAll('ImportDirective', ast)) {
      const referencedSourceUnit = resolver.resolveNode('SourceUnit', imp.sourceUnit);

      if (withPeerProject && imp.symbolAliases.length == 0) {
        throw new Error(`Transpile with peer doesn't support import without aliases in ${imp.absolutePath}`);
      }

      const imports: {[path: string]: string[]} = {};

      for (const a of imp.symbolAliases) {
        const id = referencedSourceUnit.exportedSymbols[a.foreign.name]?.[0];
        if (id === undefined) {
          throw new Error(`Can't find symbol imported in ${ast.absolutePath}`);
        }

        const contract = resolver.resolveContract(id);
        const forceImport = contract && getData(contract).importPath;
        const importPath = forceImport ?? renamePath(imp.file);

        imports[importPath] ??= [];
        imports[importPath].push([
          (forceImport || contract === undefined) ? a.foreign.name : renameContract(a.foreign.name),
          (a.local != null && a.local !== a.foreign.name) ? ` as ${a.local}` : '',
        ].join(''));
      }

      const statement = [];
      for (const [ path, aliases ] of Object.entries(imports)) {
        statement.push(`import { ${aliases.join(', ')} } from "${path}";`);
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
  }
}
