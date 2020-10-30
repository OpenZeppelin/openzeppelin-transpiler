import path from 'path';
import fs from 'fs';

import { groupBy, keyBy, mapValues } from 'lodash';
import { SourceUnit } from 'solidity-ast';

import { getContract, throwIfInvalidNode } from './solc/ast-utils';
import { applyTransformations } from './transformations/apply';
import {
  transformConstructor,
  transformContractName,
  appendDirective,
  prependBaseClass,
  removeInheritanceListArguments,
  fixImportDirectives,
  purgeVarInits,
  renameIdentifiers,
} from './transformations';
import { Artifact, buildArtifacts } from './solc/artifact';
import { Transformation } from './transformations/type';
import { relativePath } from './utils/relative-path';
import { renameContract, renamePath, isRenamed } from './rename';
import { ArtifactsMap } from './artifacts-map';
import { SolcOutput, SolcInput } from './solc/output';
import { Transform } from './transform';

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

interface FileData {
  artifacts: Artifact[];
  ast: SourceUnit;
  source: string;
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

export function transpileContracts(artifacts: Artifact[], paths: Paths): OutputFile[] {
  artifacts = artifacts.filter(a => !isRenamed(a.contractName));

  // check that we have valid ast tree
  for (const art of artifacts) {
    throwIfInvalidNode(art.ast);
  }

  // create contract name | id to artifact map for quick access to artifacts
  const contractsToArtifactsMap: ArtifactsMap = keyBy(artifacts, a => getContract(a).id);

  const fileData = mapValues(groupBy(artifacts, 'sourcePath'), fileArtifacts => ({
    artifacts: fileArtifacts,
    ast: fileArtifacts[0].ast,
    source: fileArtifacts[0].source,
  }));

  const fileTransformations = mapValues(fileData, (data, file) =>
    transpileFile(file, data, artifacts, contractsToArtifactsMap, paths.sources),
  );

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];

  for (const file in fileData) {
    const data = fileData[file];

    const transformedSource = applyTransformations(file, data.source, fileTransformations[file]);

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

function transpileFile(
  file: string,
  data: FileData,
  allArtifacts: Artifact[],
  contractsToArtifactsMap: ArtifactsMap,
  contractsDir: string,
): Transformation[] {
  const transformations = [];

  if (data.artifacts.some(art => getContract(art).contractKind === 'contract')) {
    const initializablePath = relativePath(
      path.dirname(file),
      path.join(contractsDir, 'Initializable.sol'),
    );

    transformations.push(appendDirective(data.ast, `\nimport "${initializablePath}";`));
  }

  transformations.push(...fixImportDirectives(data.ast, file));

  for (const art of data.artifacts) {
    const { contractName, source } = art;
    const contractNode = getContract(art);

    transformations.push(
      ...renameIdentifiers(contractNode, contractsToArtifactsMap),
      ...prependBaseClass(contractNode, source, 'Initializable'),
      ...transformConstructor(contractNode, source, allArtifacts, contractsToArtifactsMap),
      ...purgeVarInits(contractNode, source),
      ...removeInheritanceListArguments(contractNode),
      transformContractName(contractNode, source, renameContract(contractName)),
    );
  }

  return transformations;
}
