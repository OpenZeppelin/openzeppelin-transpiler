import path from 'path';
import fs from 'fs';
import { mapValues } from 'lodash';

import { matcher } from './utils/matcher';
import { renamePath, isRenamed } from './rename';
import { SolcOutput, SolcInput } from './solc/input-output';
import { Transform } from './transform';
import { generateWithInit } from './generate-with-init';
import { findAlreadyInitializable } from './find-already-initializable';

import { fixImportDirectives } from './transformations/fix-import-directives';
import { renameIdentifiers } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-initializable-base';
import { removeStateVarInits } from './transformations/purge-var-inits';
import { removeImmutable } from './transformations/remove-immutable';
import { removeInheritanceListArguments } from './transformations/remove-inheritance-list-args';
import { renameContractDefinition } from './transformations/rename-contract-definition';
import { appendInitializableImport } from './transformations/append-initializable-import';
import { fixNewStatement } from './transformations/fix-new-statement';
import { addRequiredPublicInitializer } from './transformations/add-required-public-initializers';
import { addStorageGaps } from './transformations/add-storage-gaps';
import { renameInheritdoc } from './transformations/rename-inheritdoc';
import {
  transformConstructor,
  removeLeftoverConstructorHead,
} from './transformations/transform-constructor';

import {addDiamondStorage} from "./transformations/add-diamond-storage";
import {addDiamondAccess} from "./transformations/add-diamond-access";
import {removeStateVariables} from "./transformations/remove-state-variables";

interface Paths {
  root: string;
  sources: string;
}

export interface OutputFile {
  fileName: string;
  source: string;
  path: string;
}

interface TranspileOptions {
  initializablePath?: string;
  exclude?: string[];
  publicInitializers?: string[];
  extractStorage?: boolean;
}

function getExtraOutputPaths(
  paths: Paths,
  options?: TranspileOptions,
): Record<'initializable' | 'withInit', string> {
  const outputPaths = mapValues(
    {
      initializable: 'Initializable.sol',
      withInit: 'mocks/WithInit.sol',
    },
    s => path.relative(paths.root, path.join(paths.sources, s)),
  );

  if (options?.initializablePath) {
    outputPaths.initializable = options?.initializablePath;
  }

  return outputPaths;
}

export async function transpile(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  paths: Paths,
  options?: TranspileOptions,
): Promise<OutputFile[]> {
  const outputPaths = getExtraOutputPaths(paths, options);
  const alreadyInitializable = findAlreadyInitializable(solcOutput, options?.initializablePath);

  const excludeSet = new Set([...alreadyInitializable, ...Object.values(outputPaths)]);
  const excludeMatch = matcher(options?.exclude ?? []);

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];

  const transform = new Transform(solcInput, solcOutput, {
    exclude: source => excludeSet.has(source) || (excludeMatch(source) ?? isRenamed(source)),
  });


  transform.apply(renameIdentifiers);
  transform.apply(renameContractDefinition);
  transform.apply(renameInheritdoc);
  transform.apply(prependInitializableBase(options?.extractStorage));
  transform.apply(fixImportDirectives);
  transform.apply(appendInitializableImport(outputPaths.initializable));
  transform.apply(fixNewStatement);
  transform.apply(addRequiredPublicInitializer(options?.publicInitializers));
  transform.apply(transformConstructor);
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(removeInheritanceListArguments);
  transform.apply(removeImmutable);
  if (!options?.extractStorage) {
    transform.apply(removeStateVarInits);
    transform.apply(addStorageGaps);
  } else {
    transform.apply(addDiamondAccess)
    transform.apply(addDiamondStorage(outputFiles));
    transform.apply(removeStateVariables);
  }

  const results = transform.results();

  for (const file in results) {
    const transformedSource = results[file];

    outputFiles.push({
      source: transformedSource,
      path: renamePath(file),
      fileName: path.basename(file),
    });
  }

  const initializableSource =
    options?.initializablePath !== undefined
      ? transpileInitializable(solcInput, solcOutput, paths, options?.initializablePath)
      : fs.readFileSync(require.resolve(options?.extractStorage ? '../InitializableFacet.sol': '../Initializable.sol'), 'utf8');

  outputFiles.push({
    source: initializableSource,
    path: outputPaths.initializable,
    fileName: path.basename(outputPaths.initializable),
  });

  if (options?.extractStorage && options?.initializablePath === undefined) {
    const initFacetStorage = fs.readFileSync(require.resolve('../InitializableFacetStorage.sol'), 'utf8');
    outputFiles.push( {
      source: initFacetStorage,
      path: path.dirname(outputPaths.initializable) + path.sep + 'InitializableStorage.sol',
      fileName: 'InitializableStorage.sol',
    });
  }

  outputFiles.push({
    source: generateWithInit(transform, outputPaths.withInit),
    path: outputPaths.withInit,
    fileName: path.basename(outputPaths.withInit),
  });


  return outputFiles;
}

function transpileInitializable(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  paths: Paths,
  initializablePath: string,
): string {
  const transform = new Transform(solcInput, solcOutput);

  transform.apply(function* (ast, tools) {
    if (ast.absolutePath === initializablePath) {
      yield* renameIdentifiers(ast, tools);
      yield* fixImportDirectives(ast, tools);
    }
  });

  return transform.results()[initializablePath];
}
