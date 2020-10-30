import path from 'path';
import fs from 'fs';

import { renamePath } from './rename';
import { SolcOutput, SolcInput } from './solc/output';
import { Transform } from './transform';

import { fixImportDirectives } from './transformations/fix-import-directives';
import { renameIdentifiers2 } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-base-class';
import { purgeVarInits2 } from './transformations/purge-var-inits';
import { removeInheritanceListArguments2 } from './transformations/remove-inheritance-list-args';
import { transformContractName2 } from './transformations/transform-contract-name';
import { appendInitializableImport } from './transformations/append-directive';
import {
  transformConstructor2,
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

  transform.apply(renameIdentifiers2);
  transform.apply(transformContractName2);
  transform.apply(prependInitializableBase);
  transform.apply(fixImportDirectives);
  transform.apply(su => appendInitializableImport(paths.sources, su));
  transform.apply(transformConstructor2);
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(removeInheritanceListArguments2);
  transform.apply(purgeVarInits2);

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
