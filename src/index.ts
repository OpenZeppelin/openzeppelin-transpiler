import path from 'path';
import fs from 'fs';

import { flatten, groupBy, keyBy, mapValues } from 'lodash';
import { SourceUnit } from 'solidity-ast';

import { getContract, isContract, throwIfInvalidNode } from './solc/ast-utils';
import { applyTransformations } from './transformations/apply';
import {
  transformConstructor,
  transformContractName,
  appendDirective,
  prependBaseClass,
  transformParentsNames,
  fixImportDirectives,
  purgeVarInits,
  transformOverrides,
  renameIdentifiers,
} from './transformations';
import { getInheritanceChain } from './solc/get-inheritance-chain';
import { Artifact } from './solc/artifact';
import { Transformation } from './transformations/type';
import { relativePath } from './utils/relative-path';
import { renameContract, renamePath, isRenamed } from './rename';
import { ArtifactsMap } from './artifacts-map';

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

export function transpileContracts(artifacts: Artifact[], contractsDir: string): OutputFile[] {
  artifacts = artifacts
    .map(a => normalizeSourcePath(a, contractsDir))
    .filter(a => !isRenamed(a.contractName));

  // check that we have valid ast tree
  for (const art of artifacts) {
    throwIfInvalidNode(art.ast);
  }

  // create contract name | id to artifact map for quick access to artifacts
  const contractsToArtifactsMap: ArtifactsMap = keyBy(artifacts, a => getContract(a).id);

  const fileData = mapValues(
    groupBy(artifacts, 'sourcePath'),
    fileArtifacts => ({
      artifacts: fileArtifacts,
      ast: fileArtifacts[0].ast,
      source: fileArtifacts[0].source,
    })
  );

  const fileTransformations = mapValues(
    fileData,
    (data, file) => transpileFile(file, data, artifacts, contractsToArtifactsMap, contractsDir),
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
    path: path.join(contractsDir, 'Initializable.sol'),
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
    const initializablePath = relativePath(path.dirname(file), path.join(contractsDir, 'Initializable.sol'));

    transformations.push(
      appendDirective(data.ast, `\nimport "${initializablePath}";`),
      ...fixImportDirectives(data.ast, file, allArtifacts),
    );
  }

  for (const art of data.artifacts) {
    const { contractName, source } = art;
    const contractNode = getContract(art);

    transformations.push(
      ...prependBaseClass(contractNode, source, 'Initializable'),
      ...transformParentsNames(contractNode, source, allArtifacts),
      ...transformConstructor(contractNode, source, allArtifacts, contractsToArtifactsMap),
      ...purgeVarInits(contractNode, source),
      transformContractName(contractNode, source, renameContract(contractName)),
      ...renameIdentifiers(contractNode, contractsToArtifactsMap),
    );
  }

  return transformations;
}

function normalizeSourcePath(art: Artifact, contractsDir: string): Artifact {
  // Truffle stores an absolute file path in a sourcePath of an artifact field
  // "sourcePath": "/Users/iYalovoy/repo/openzeppelin-sdk/tests/cli/workdir/contracts/Samples.sol"
  // OpenZeppelin CLI stores relative paths
  // "sourcePath": "contracts/Foo.sol"
  // OpenZeppelin sourcePath would start with `contracts` for contracts present in the `contracts` folder of a project
  // Both Truffle and OpenZeppelin support packages
  // "sourcePath": "@openzeppelin/upgrades/contracts/Initializable.sol",
  // Relative paths can only be specified using `.` and `..` for both compilers

  // if path resolves to a path in the contrcts directory then it is a local contract
  if (path.resolve(art.sourcePath).startsWith(path.resolve(contractsDir))) {
    let sourcePath = relativePath(path.dirname(contractsDir), art.sourcePath);
    return { ...art, sourcePath }
  } else {
    return art;
  }
}
