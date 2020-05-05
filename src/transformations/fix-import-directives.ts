import path from 'path';

import { getImportDirectives, getSourceIndices } from '../solc/ast-utils';
import { Artifact } from '../solc/artifact';
import { Transformation } from '../transformation';

export function* fixImportDirectives(
  artifact: Artifact,
  artifacts: Artifact[],
  contracts: Artifact[],
): Generator<Transformation> {
  const dirname = path.dirname(artifact.sourcePath);

  const imports = getImportDirectives(artifact.ast);

  for (const imp of imports) {
    const transformed = [];

    const isLocal = artifacts.some(
      art => art.ast.id === imp.sourceUnit && art.sourcePath.startsWith('.')
    );

    const isTranspiled = artifacts.some(
      art => art.ast.id === imp.sourceUnit && contracts.includes(art)
    );

    // imports the transpiled file
    if (isTranspiled) {
      if (isLocal) {
        transformed.unshift(imp.file); // TODO: may not be a relative path
      } else {
        transformed.unshift(path.relative(dirname, imp.file));
      }
    } else {
      if (isLocal) {
        transformed.push(
          path.relative(
            path.join('__upgradeable__', dirname),
            path.join(dirname, imp.file),
          )
        );
      } else {
        transformed.push(imp.file);
      }
    }

    const finalTransformation = transformed.map(t => `import "${t}";`).join('\n');
    const [start, len] = getSourceIndices(imp);

    if (isLocal || isTranspiled) {
      yield {
        kind: 'fix-import-directives',
        start: start,
        end: start + len,
        text: finalTransformation,
      };
    }
  }
}
