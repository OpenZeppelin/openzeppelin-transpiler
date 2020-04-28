import path from 'path';
import fs from 'fs';

import { flatten } from 'lodash';

import { getContract, isContract, throwIfInvalidNode } from './solc/ast-utils';
import { transpile } from './transpiler';
import {
  transformConstructor,
  transformContractName,
  appendDirective,
  prependBaseClass,
  purgeExceptContracts,
  transformParentsNames,
  fixImportDirectives,
  purgeVarInits,
} from './transformations/index';
import { getInheritanceChain } from './solc/get-inheritance-chain';
import { Artifact } from './solc/artifact';
import { Transformation } from './transformation';

export interface OutputFile {
  fileName: string;
  source: string;
  path: string;
  contracts: string[];
}

interface FileTransformation {
  transformations: Transformation[];
  source: string;
}

export function transpileContracts(contracts: string[], artifacts: Artifact[], contractsDir: string): OutputFile[] {
  artifacts = artifacts.map(a => normalizeSourcePath(a, contractsDir));

  // check that we have valid ast tree
  for (const art of artifacts) {
    throwIfInvalidNode(art.ast);
  }

  // create contract name | id to artifact map for quick access to artifacts
  const contractsToArtifactsMap: Record<string | number, Artifact> = {};
  for (const art of artifacts) {
    contractsToArtifactsMap[art.contractName] = art;
    const contract = getContract(art);
    contractsToArtifactsMap[contract.id] = art;
  }

  // build a list of all contracts to transpile
  const contractsToTranspile = [
    ...new Set(flatten(contracts.map(contract => getInheritanceChain(contract, contractsToArtifactsMap)))),
  ].filter(art => {
    const contractNode = getContract(art);
    return isContract(contractNode);
  });

  // build a array of transformations per Solidity file
  const fileTrans: Record<string, FileTransformation> = {};
  for (const art of contractsToTranspile) {
    const contractName = art.contractName;

    const source = art.source;

    const contractNode = getContract(art);

    if (!fileTrans[art.sourcePath]) {
      const initializablePath = path.relative(path.dirname(art.sourcePath), 'Initializable.sol');
      const directive = `\nimport "./${initializablePath}";`;

      fileTrans[art.sourcePath] = {
        transformations: [
          appendDirective(art.ast, directive),
          ...fixImportDirectives(art, artifacts, contractsToTranspile),
          ...purgeExceptContracts(art.ast, contractsToTranspile),
        ],
        source: '',
      };
    }

    fileTrans[art.sourcePath].transformations = [
      ...fileTrans[art.sourcePath].transformations,
      prependBaseClass(contractNode, source, 'Initializable'),
      ...transformParentsNames(contractNode, source, contractsToTranspile),
      ...transformConstructor(contractNode, source, contractsToTranspile, contractsToArtifactsMap),
      ...purgeVarInits(contractNode, source),
      transformContractName(contractNode, source, `${contractName}Upgradeable`),
    ];
  }

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];
  for (const art of contractsToTranspile) {
    const contractName = art.contractName;

    const source = art.source;

    const fileTran = fileTrans[art.sourcePath];
    if (!fileTran.source) {
      fileTran.source = transpile(art.sourcePath, source, fileTran.transformations);
    }
    const entry = outputFiles.find(o => o.fileName === path.basename(art.sourcePath));
    if (!entry) {
      const upgradeablePath = path.normalize(art.sourcePath).replace('.sol', 'Upgradeable.sol');

      const patchedFilePath = path.join('./contracts/__upgradeable__', upgradeablePath);

      outputFiles.push({
        source: fileTran.source,
        path: patchedFilePath,
        fileName: path.basename(art.sourcePath),
        contracts: [contractName],
      });
    } else {
      entry.contracts.push(contractName);
    }
  }

  outputFiles.push({
    source: fs.readFileSync(require.resolve('../Initializable.sol'), 'utf8'),
    path: './contracts/__upgradeable__/Initializable.sol',
    fileName: 'Initializable.sol',
    contracts: ['Initializable'],
  });

  return outputFiles;
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
    const sourcePath = path.relative(contractsDir, art.sourcePath);
    return { ...art, sourcePath }
  } else {
    return art;
  }
}
