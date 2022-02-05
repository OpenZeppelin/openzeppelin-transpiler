import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renameContract, renamePath } from '../rename';
import { TransformerTools } from '../transform';
import {ASTResolverError} from "../ast-resolver";

export function* fixImportDirectives(
  ast: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  for (const imp of findAll('ImportDirective', ast)) {
    const referencedSourceUnit = resolver.resolveNode('SourceUnit', imp.sourceUnit, false);
    if (!referencedSourceUnit) {
      throw new ASTResolverError('SourceUnit');
    }

    const aliases = imp.symbolAliases.map(a => {
      const id = referencedSourceUnit.exportedSymbols[a.foreign.name]?.[0];
      if (id === undefined) {
        throw new Error(`Can't find symbol imported in ${ast.absolutePath}`);
      }
      let alias = '';
      const contract = resolver.resolveContract(id);
      if (contract === undefined) {
        alias += a.foreign.name;
      } else {
        alias += renameContract(a.foreign.name);
      }
      if (a.local != null && a.local !== a.foreign.name) {
        alias += ` as ${a.local}`;
      }
      return alias;
    });

    const statement = ['import'];
    if (aliases.length > 0) {
      statement.push(`{ ${aliases.join(', ')} } from`);
    }
    statement.push(`"${renamePath(imp.file)}";`);

    yield {
      kind: 'fix-import-directives',
      text: statement.join(' '),
      ...getNodeBounds(imp),
    };
  }
}
