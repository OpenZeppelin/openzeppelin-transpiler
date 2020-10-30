import { SourceUnit } from 'solidity-ast';
import { getImportDirectives, getSourceIndices } from '../solc/ast-utils';
import { Transformation } from './type';
import { renamePath } from '../rename';

export function* fixImportDirectives(ast: SourceUnit): Generator<Transformation> {
  const imports = getImportDirectives(ast);

  for (const imp of imports) {
    const [start, len] = getSourceIndices(imp);

    yield {
      kind: 'fix-import-directives',
      start: start,
      length: len,
      text: `import "${renamePath(imp.file)}";`,
    };
  }
}
