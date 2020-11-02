import path from 'path';
import fs from 'fs';

import { renamePath } from './rename';
import { SolcOutput, SolcInput } from './solc/input-output';
import { Transform } from './transform';

import { fixImportDirectives } from './transformations/fix-import-directives';
import { renameIdentifiers } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-initializable-base';
import { removeStateVarInits } from './transformations/purge-var-inits';
import { removeInheritanceListArguments } from './transformations/remove-inheritance-list-args';
import { renameContractDefinition } from './transformations/rename-contract-definition';
import { appendInitializableImport } from './transformations/append-initializable-import';
import {
  transformConstructor,
  removeLeftoverConstructorHead,
} from './transformations/transform-constructor';

interface Paths {
  root: string;
  sources: string;
}

export interface OutputFile {
  fileName: string;
  source: string;
  path: string;
}

export async function transpile(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  paths: Paths,
): Promise<OutputFile[]> {
  const transform = new Transform(solcInput, solcOutput);

  transform.apply(renameIdentifiers);
  transform.apply(renameContractDefinition);
  transform.apply(prependInitializableBase);
  transform.apply(fixImportDirectives);
  transform.apply(su => appendInitializableImport(paths.sources, su));
  transform.apply(transformConstructor);
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(removeInheritanceListArguments);
  transform.apply(removeStateVarInits);

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];

  const results = transform.results();

  for (const file in results) {
    const transformedSource = results[file];

    outputFiles.push({
      source: transformedSource,
      path: renamePath(file),
      fileName: path.basename(file),
    });
  }

  outputFiles.push({
    source: fs.readFileSync(require.resolve('../Initializable.sol'), 'utf8'),
    path: path.join(paths.sources, 'Initializable.sol'),
    fileName: 'Initializable.sol',
  });

  return outputFiles;
}
