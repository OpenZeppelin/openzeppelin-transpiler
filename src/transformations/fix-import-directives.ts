import path from 'path';

import { getImportDirectives, getSourceIndices } from '../solc/ast-utils';
import { Artifact } from '../solc/artifact';
import { Transformation } from './type';
import { relativePath } from '../utils/relative-path';

export function* fixImportDirectives(
  artifact: Artifact,
  artifacts: Artifact[],
): Generator<Transformation> {
  const dirname = path.dirname(artifact.sourcePath);

  const imports = getImportDirectives(artifact.ast);

  for (const imp of imports) {
    const transformed = [];

    if (imp.file.startsWith('.')) {
      transformed.unshift(imp.file); // TODO: may not be a relative path
    } else {
      transformed.unshift(relativePath(dirname, imp.file));
    }

    const finalTransformation = transformed.map(t => `import "${t}";`).join('\n');
    const [start, len] = getSourceIndices(imp);

    yield {
      kind: 'fix-import-directives',
      start: start,
      end: start + len,
      text: finalTransformation,
    };
  }
}
