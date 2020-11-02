#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import 'source-map-support/register';

import bre from '@nomiclabs/buidler';

import { transpile } from '.';
import { SolcOutput, SolcInput } from './solc/input-output';

async function main() {
  const solcInputPath = path.join(bre.config.paths.cache, 'solc-input.json');
  const solcInput: SolcInput = JSON.parse(await fs.readFile(solcInputPath, 'utf8'));
  const solcOutputPath = path.join(bre.config.paths.cache, 'solc-output.json');
  const solcOutput: SolcOutput = JSON.parse(await fs.readFile(solcOutputPath, 'utf8'));
  const transpiled = await transpile(solcInput, solcOutput, bre.config.paths);

  await Promise.all(
    transpiled.map(async t => {
      await fs.mkdir(path.dirname(t.path), { recursive: true });
      await fs.writeFile(t.path, t.source);
    }),
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
