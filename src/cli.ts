#!/usr/bin/env node

import 'source-map-support/register';
import { promises as fs } from 'fs';
import path from 'path';
import minimist from 'minimist';
import type { BuidlerRuntimeEnvironment } from '@nomiclabs/buidler/types';

import { transpile } from '.';
import { SolcOutput, SolcInput } from './solc/input-output';

async function getPaths() {
  const buidler = require.resolve('@nomiclabs/buidler', { paths: [process.cwd()] });
  const bre: BuidlerRuntimeEnvironment = await import(buidler);
  return bre.config.paths;
}

function getFlags() {
  const { D: deleteOriginals = false, x: exclude = [] } = minimist(process.argv.slice(2));
  return {
    deleteOriginals,
    exclude: Array.isArray(exclude) ? exclude : [exclude],
  };
}

async function getVersion() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('../package.json');
  return pkg.name + '@' + pkg.version;
}

async function main() {
  console.error(await getVersion());

  const { deleteOriginals, exclude } = getFlags();
  const paths = await getPaths();

  const solcInputPath = path.join(paths.cache, 'solc-input.json');
  const solcInput: SolcInput = JSON.parse(await fs.readFile(solcInputPath, 'utf8'));
  const solcOutputPath = path.join(paths.cache, 'solc-output.json');
  const solcOutput: SolcOutput = JSON.parse(await fs.readFile(solcOutputPath, 'utf8'));
  const transpiled = await transpile(solcInput, solcOutput, paths, { exclude });

  await Promise.all(
    transpiled.map(async t => {
      const outputPath = path.join(paths.root, t.path);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, t.source);
    }),
  );

  if (deleteOriginals) {
    const generated = new Set(transpiled.map(t => path.join(paths.root, t.path)));
    const originals = Object.keys(solcOutput.sources)
      .map(s => path.join(paths.root, s))
      .filter(p => !generated.has(p));

    await Promise.all(originals.map(p => fs.unlink(p)));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
