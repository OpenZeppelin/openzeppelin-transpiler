import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { renamePath } from '../rename';

export function* fixImportDirectives(ast: SourceUnit): Generator<Transformation> {
  for (const imp of findAll('ImportDirective', ast)) {
    yield {
      kind: 'fix-import-directives',
      text: `import "${renamePath(imp.file)}";`,
      ...getNodeBounds(imp),
    };
  }
}
