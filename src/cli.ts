#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import minimist from 'minimist';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

import { transpile } from '.';
import { SolcOutput, SolcInput } from './solc/input-output';
import { findAlreadyInitializable } from './find-already-initializable';

async function getPaths() {
  const hardhat = require.resolve('hardhat', { paths: [process.cwd()] });
  const hre: HardhatRuntimeEnvironment = (await import(hardhat)).default;
  return hre.config.paths;
}

interface Options {
  initializablePath?: string;
  buildInfo?: string;
  deleteOriginals: boolean;
  skipWithInit: boolean;
  exclude: string[];
  publicInitializers: string[];
  namespaced: boolean;
  namespaceExclude: string[];
  peerProject?: string;
}

function readCommandFlags(resolveRootRelative: (p: string) => string): Options {
  const {
    b: buildInfo,
    i: initializablePath,
    p: publicInitializers = [],
    D: deleteOriginals = false,
    x: exclude = [],
    W: skipWithInit = false,
    n: namespaced = false,
    N: namespaceExclude = [],
    q: peerProject,
  } = minimist(process.argv.slice(2));
  return {
    buildInfo,
    deleteOriginals,
    skipWithInit,
    namespaced,
    peerProject,
    namespaceExclude: ensureArray(namespaceExclude).map(resolveRootRelative),
    initializablePath: initializablePath && resolveRootRelative(initializablePath),
    publicInitializers: ensureArray(publicInitializers).map(resolveRootRelative),
    exclude: ensureArray(exclude).map(p =>
      p.replace(
        /^(!*)(.*)/,
        (_: string, neg: string, pat: string) => neg + resolveRootRelative(pat),
      ),
    ),
  };
}

function ensureArray<T>(arr: T | T[]): T[] {
  if (Array.isArray(arr)) {
    return arr;
  } else {
    return [arr];
  }
}

async function getVersion() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../package.json');
  return pkg.name + '@' + pkg.version;
}

async function main() {
  console.error(await getVersion());

  const paths = await getPaths();
  const resolveRootRelative = (p: string) => path.relative(paths.root, path.resolve(p));
  const options = readCommandFlags(resolveRootRelative);

  let buildInfo = options.buildInfo;

  if (buildInfo === undefined) {
    const buildInfoDir = path.join(paths.artifacts, 'build-info');
    const filenames = await fs.readdir(buildInfoDir);
    if (filenames.length != 1) {
      throw new Error(`Expected ${buildInfoDir} to contain only one file`);
    }
    buildInfo = path.join(buildInfoDir, filenames[0]);
  }

  const {
    input: solcInput,
    output: solcOutput,
    solcVersion,
  }: {
    input: SolcInput;
    output: SolcOutput;
    solcVersion: string;
  } = JSON.parse(await fs.readFile(buildInfo, 'utf8'));

  const transpiled = await transpile(solcInput, solcOutput, paths, { solcVersion, ...options });

  await Promise.all(
    transpiled.map(async t => {
      const outputPath = path.join(paths.root, t.path);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, t.source);
    }),
  );

  if (options.deleteOriginals) {
    const keep = new Set(
      [
        ...transpiled.map(t => t.path),
        ...findAlreadyInitializable(solcOutput, options.initializablePath),
      ].map(p => path.join(paths.root, p)),
    );
    if (options.initializablePath) {
      keep.add(path.join(paths.root, options.initializablePath));
    }
    const originals = Object.keys(solcOutput.sources)
      .map(s => path.join(paths.root, s))
      .filter(p => !keep.has(p));

    await Promise.all(originals.map(p => fs.unlink(p).catch(() => undefined)));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
