import path from 'path';
import fs from 'fs';

import { flatten, groupBy, mapValues } from 'lodash';
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
} from './transformations';
import { getInheritanceChain } from './solc/get-inheritance-chain';
import { Artifact } from './solc/artifact';
import { Transformation } from './transformations/type';
import { relativePath } from './utils/relative-path';
import { renameContract } from './rename-contract';

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

type ContractsToArtifactsMap = Record<string | number, Artifact>;

export function transpileContracts(artifacts: Artifact[], contractsDir: string): OutputFile[] {
  artifacts = artifacts.map(a => normalizeSourcePath(a, contractsDir));

  // check that we have valid ast tree
  for (const art of artifacts) {
    throwIfInvalidNode(art.ast);
  }

  // create contract name | id to artifact map for quick access to artifacts
  const contractsToArtifactsMap: ContractsToArtifactsMap = {};
  for (const art of artifacts) {
    contractsToArtifactsMap[art.contractName] = art;
    const contract = getContract(art);
    contractsToArtifactsMap[contract.id] = art;
  }

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
    (data, file) => transpileFile(file, data, artifacts, contractsToArtifactsMap),
  );

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];

  for (const file in fileData) {
    const data = fileData[file];

    const transformedSource = applyTransformations(file, data.source, fileTransformations[file]);
    const patchedFilePath = path.join('./contracts/__upgradeable__', path.normalize(file));

    outputFiles.push({
      source: transformedSource,
      path: patchedFilePath,
      fileName: path.basename(file),
    });
  }

  outputFiles.push({
    source: fs.readFileSync(require.resolve('../Initializable.sol'), 'utf8'),
    path: './contracts/__upgradeable__/Initializable.sol',
    fileName: 'Initializable.sol',
  });

  return outputFiles;
}

function transpileFile(
  file: string,
  data: FileData,
  allArtifacts: Artifact[],
  contractsToArtifactsMap: ContractsToArtifactsMap
): Transformation[] {

  const initializablePath = relativePath(path.dirname(file), 'Initializable.sol');

  const imports = [initializablePath];

  if (file.startsWith('.')) {
    imports.unshift(
      relativePath(
        path.join('__upgradeable__', path.dirname(file)),
        path.join(file),
      )
    );
  } else {
    imports.unshift(file);
  }

  const directive = '\n' + imports.map(i => `import "${i}";`).join('\n');

  const transformations = [];

  transformations.push(
    appendDirective(data.ast, directive),
    ...fixImportDirectives(data.ast, file, allArtifacts),
  );

  for (const art of data.artifacts) {
    const { contractName, source } = art;
    const contractNode = getContract(art);

    transformations.push(
      prependBaseClass(contractNode, source, 'Initializable'),
      ...transformParentsNames(contractNode, source, allArtifacts),
      transformConstructor(contractNode, source, allArtifacts, contractsToArtifactsMap),
      ...purgeVarInits(contractNode, source),
      transformContractName(contractNode, source, renameContract(contractName)),
      ...transformOverrides(contractNode, source, allArtifacts, contractsToArtifactsMap),
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
    let sourcePath = relativePath(contractsDir, art.sourcePath);
    return { ...art, sourcePath }
  } else {
    return art;
  }
}
