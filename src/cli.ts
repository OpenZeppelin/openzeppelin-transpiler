#!/usr/bin/env node

import 'source-map-support/register';
import { promises as fs } from 'fs';
import path from 'path';
import minimist from 'minimist';
import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';

import { transpile } from '.';
import { SolcOutput, SolcInput } from './solc/input-output';
import { findAlreadyInitializable } from './find-already-initializable';

async function getPaths() {
  const buidler = require.resolve('@nomiclabs/buidler', { paths: [process.cwd()] });
  const bre: BuidlerRuntimeEnvironment = await import(buidler);
  return bre.config.paths;
}

interface Options {
  initializablePath?: string;
  deleteOriginals: boolean;
  exclude: string[];
  publicInitializers: string[];
}

function readCommandFlags(resolveRootRelative: (p: string) => string): Options {
  const {
    i: initializablePath,
    p: publicInitializers = [],
    D: deleteOriginals = false,
    x: exclude = [],
  } = minimist(process.argv.slice(2));
  return {
    deleteOriginals,
    initializablePath: resolveRootRelative(initializablePath),
    publicInitializers: ensureArray(publicInitializers).map(resolveRootRelative),
    exclude: ensureArray(exclude).map(resolveRootRelative),
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

  const solcInputPath = path.join(paths.cache, 'solc-input.json');
  const solcInput: SolcInput = JSON.parse(await fs.readFile(solcInputPath, 'utf8'));
  const solcOutputPath = path.join(paths.cache, 'solc-output.json');
  const solcOutput: SolcOutput = JSON.parse(await fs.readFile(solcOutputPath, 'utf8'));
  const transpiled = await transpile(solcInput, solcOutput, paths, options);

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
