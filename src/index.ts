import path from 'path';
import fs from 'fs';
import { mapValues } from 'lodash';
import { minimatch } from 'minimatch';

import { findAll } from 'solidity-ast/utils';
import { Node } from 'solidity-ast/node';

import { matcher } from './utils/matcher';
import { renamePath, isRenamed } from './rename';
import { SolcOutput, SolcInput } from './solc/input-output';
import { Transform, TransformData } from './transform';
import { generateWithInit } from './generate-with-init';
import { findAlreadyInitializable } from './find-already-initializable';

import { fixImportDirectives } from './transformations/fix-import-directives';
import { renameIdentifiers } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-initializable-base';
import { removeStateVarInits } from './transformations/purge-var-inits';
import { removeImmutable } from './transformations/remove-immutable';
import { removePartial } from './transformations/remove-partial';
import { removeInheritanceListArguments } from './transformations/remove-inheritance-list-args';
import { renameContractDefinition } from './transformations/rename-contract-definition';
import { appendInitializableImport } from './transformations/append-initializable-import';
import { fixNewStatement } from './transformations/fix-new-statement';
import { addRequiredPublicInitializer } from './transformations/add-required-public-initializers';
import { addStorageGaps } from './transformations/add-storage-gaps';
import { addNamespaceStruct } from './transformations/add-namespace-struct';
import { renameInheritdoc } from './transformations/rename-inheritdoc';
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

interface TranspileOptions {
  initializablePath?: string;
  exclude?: string[];
  publicInitializers?: string[];
  solcVersion?: string;
  skipWithInit?: boolean;
  namespaced?: boolean;
  namespaceExclude?: string[];
  peerProject?: string;
}

type NodeTransformData = { node: Node; data: Partial<TransformData> };

function getExtraOutputPaths(
  paths: Paths,
  options: TranspileOptions = {},
): Record<'initializable' | 'withInit', string> {
  const outputPaths = mapValues(
    {
      initializable: 'Initializable.sol',
      withInit: 'mocks/WithInit.sol',
    },
    s => path.relative(paths.root, path.join(paths.sources, s)),
  );

  if (options.initializablePath) {
    outputPaths.initializable = options.initializablePath;
  }

  return outputPaths;
}

function getExcludeAndImportPathsForPeer(
  solcOutput: SolcOutput,
  peerProject: string,
): [Set<string>, NodeTransformData[]] {
  const data: NodeTransformData[] = [];
  const exclude: Set<string> = new Set();

  for (const [source, { ast }] of Object.entries(solcOutput.sources)) {
    let shouldExclude = true;
    for (const node of ast.nodes) {
      if (node.nodeType === 'ContractDefinition' && node.contractKind === 'contract') {
        shouldExclude = false;
      } else {
        const importFromPeer = path.join(peerProject, source);
        data.push({ node, data: { importFromPeer } });
      }
    }
    if (shouldExclude) {
      exclude.add(source);
    }
  }

  return [exclude, data];
}

export async function transpile(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  paths: Paths,
  options: TranspileOptions = {},
): Promise<OutputFile[]> {
  const nodeData: NodeTransformData[] = [];

  const outputPaths = getExtraOutputPaths(paths, options);
  const alreadyInitializable = findAlreadyInitializable(solcOutput, options.initializablePath);

  const excludeSet = new Set([...alreadyInitializable, ...Object.values(outputPaths)]);
  const softExcludeSet = new Set();
  const excludeMatch = matcher(options.exclude ?? []);

  const namespaceInclude = (source: string) => {
    const namespaced = options.namespaced ?? false;
    const namespaceExclude = options.namespaceExclude ?? [];
    return namespaced && !namespaceExclude.some(p => minimatch(source, p));
  };

  // if partial transpilation, extract the list of soft exclude, and the peer import paths.
  if (options.peerProject !== undefined) {
    const [peerSoftExcludeSet, importFromPeerData] = getExcludeAndImportPathsForPeer(
      solcOutput,
      options.peerProject,
    );
    peerSoftExcludeSet.forEach(source => softExcludeSet.add(source));
    nodeData.push(...importFromPeerData);
  }

  const transform = new Transform(solcInput, solcOutput, {
    exclude: source =>
      excludeSet.has(source) || (excludeMatch(source) ?? isRenamed(source))
        ? 'hard'
        : softExcludeSet.has(source)
        ? 'soft'
        : false,
  });

  for (const { node, data } of nodeData) {
    Object.assign(transform.getData(node), data);
  }

  transform.apply(renameIdentifiers);
  transform.apply(renameContractDefinition);
  transform.apply(renameInheritdoc);
  transform.apply(prependInitializableBase);
  transform.apply(fixImportDirectives(!!options.peerProject));
  transform.apply(appendInitializableImport(outputPaths.initializable));
  transform.apply(fixNewStatement);
  transform.apply(transformConstructor(namespaceInclude));
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(addRequiredPublicInitializer(options.publicInitializers));
  transform.apply(removeInheritanceListArguments);
  transform.apply(removeStateVarInits);
  transform.apply(removeImmutable);
  transform.apply(removePartial);

  if (options.namespaced) {
    transform.apply(addNamespaceStruct(namespaceInclude));
  } else {
    transform.apply(addStorageGaps);
  }

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

  const initializableSource =
    options.initializablePath !== undefined
      ? transpileInitializable(solcInput, solcOutput, paths, {
          ...options,
          initializablePath: options.initializablePath,
        })
      : fs.readFileSync(require.resolve('../Initializable.sol'), 'utf8');

  outputFiles.push({
    source: initializableSource,
    path: outputPaths.initializable,
    fileName: path.basename(outputPaths.initializable),
  });

  if (!options.skipWithInit) {
    outputFiles.push({
      source: generateWithInit(transform, outputPaths.withInit, options.solcVersion),
      path: outputPaths.withInit,
      fileName: path.basename(outputPaths.withInit),
    });
  }

  return outputFiles;
}

function transpileInitializable(
  solcInput: SolcInput,
  solcOutput: SolcOutput,
  paths: Paths,
  options: TranspileOptions & Required<Pick<TranspileOptions, 'initializablePath'>>,
): string {
  const transform = new Transform(solcInput, solcOutput);

  transform.apply(function* (ast, tools) {
    if (ast.absolutePath === options.initializablePath) {
      yield* renameIdentifiers(ast, tools);
      yield* fixImportDirectives(!!options.peerProject)(ast, tools);
    }
  });

  return transform.results()[options.initializablePath];
}
