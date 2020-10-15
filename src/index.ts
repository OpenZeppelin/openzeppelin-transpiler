import path from 'path';
import fs from 'fs';

import { flatten } from 'lodash';

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

export interface OutputFile {
  fileName: string;
  source: string;
  path: string;
}

interface FileTransformation {
  transformations: Transformation[];
  source?: string;
}

export function transpileContracts(artifacts: Artifact[], contractsDir: string): OutputFile[] {
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

  // build a array of transformations per Solidity file
  const fileTrans: Record<string, FileTransformation> = {};

  for (const art of artifacts) {
    const { contractName, source } = art;
    const contractNode = getContract(art);

    if (!fileTrans[art.sourcePath]) {
      let initializablePath = relativePath(path.dirname(art.sourcePath), 'Initializable.sol');

      const imports = [initializablePath];

      if (art.sourcePath.startsWith('.')) {
        imports.unshift(
          relativePath(
            path.join('__upgradeable__', path.dirname(art.sourcePath)),
            path.join(art.sourcePath),
          )
        );
      } else {
        imports.unshift(art.sourcePath);
      }

      const directive = '\n' + imports.map(i => `import "${i}";`).join('\n');

      fileTrans[art.sourcePath] = {
        transformations: [
          appendDirective(art.ast, directive),
          ...fixImportDirectives(art, artifacts),
        ],
      };
    }

    fileTrans[art.sourcePath].transformations = [
      ...fileTrans[art.sourcePath].transformations,
      prependBaseClass(contractNode, source, 'Initializable'),
      ...transformParentsNames(contractNode, source, artifacts),
      transformConstructor(contractNode, source, artifacts, contractsToArtifactsMap),
      ...purgeVarInits(contractNode, source),
      transformContractName(contractNode, source, `${contractName}Upgradeable`),
      ...transformOverrides(contractNode, source, artifacts, contractsToArtifactsMap),
    ];
  }

  // build a final array of files to return
  const outputFiles: OutputFile[] = [];

  for (const art of artifacts) {
    const { contractName, source } = art;

    const fileTran = fileTrans[art.sourcePath];

    if (fileTran.source === undefined) {
      fileTran.source = applyTransformations(art.sourcePath, source, fileTran.transformations);
    }

    const entry = outputFiles.find(o => o.fileName === path.basename(art.sourcePath));

    if (!entry) {
      const upgradeablePath = path.normalize(art.sourcePath);

      const patchedFilePath = path.join('./contracts/__upgradeable__', upgradeablePath);

      outputFiles.push({
        source: fileTran.source,
        path: patchedFilePath,
        fileName: path.basename(art.sourcePath),
      });
    }
  }

  outputFiles.push({
    source: fs.readFileSync(require.resolve('../Initializable.sol'), 'utf8'),
    path: './contracts/__upgradeable__/Initializable.sol',
    fileName: 'Initializable.sol',
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
    let sourcePath = relativePath(contractsDir, art.sourcePath);
    return { ...art, sourcePath }
  } else {
    return art;
  }
}
