#!/usr/bin/env node

import 'source-map-support/register';
import { promises as fs } from 'fs';
import path from 'path';
import minimist from 'minimist';

import bre from '@nomiclabs/buidler';

import { transpile } from '.';
import { SolcOutput, SolcInput } from './solc/input-output';

async function main() {
  const { D: deleteOriginals } = minimist(process.argv.slice(2));

  const solcInputPath = path.join(bre.config.paths.cache, 'solc-input.json');
  const solcInput: SolcInput = JSON.parse(await fs.readFile(solcInputPath, 'utf8'));
  const solcOutputPath = path.join(bre.config.paths.cache, 'solc-output.json');
  const solcOutput: SolcOutput = JSON.parse(await fs.readFile(solcOutputPath, 'utf8'));
  const transpiled = await transpile(solcInput, solcOutput, bre.config.paths);

  await Promise.all(
    transpiled.map(async t => {
      const outputPath = path.join(bre.config.paths.root, t.path);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, t.source);
    }),
  );

  if (deleteOriginals) {
    const generated = new Set(transpiled.map(t => path.join(bre.config.paths.root, t.path)));
    const originals = Object.keys(solcOutput.sources)
      .map(s => path.join(bre.config.paths.root, s))
      .filter(p => !generated.has(p));

    await Promise.all(originals.map(p => fs.unlink(p)));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
