#!/usr/bin/env node

import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';
import 'source-map-support/register';

import { transpileContracts } from '.';
import { Artifact, buildArtifacts } from './solc/artifact';
import { SolcOutput } from './solc/output';

async function readArtifacts(): Promise<Artifact[]> {
  const useSolcOutput = fs
    .access('cache/solc-output.json', fsConstants.R_OK)
    .then(() => true)
    .catch(() => false);
  if (useSolcOutput) {
    const solcOutput: SolcOutput = JSON.parse(await fs.readFile('cache/solc-output.json', 'utf8'));
    return buildArtifacts(solcOutput);
  } else {
    const dir = 'build/contracts';
    const names = await fs.readdir(dir);
    return await Promise.all(
      names.map(async n => JSON.parse(await fs.readFile(path.join(dir, n), 'utf8'))),
    );
  }
}

async function main() {
  const artifacts = await readArtifacts();
  const transpiled = transpileContracts(artifacts, 'contracts');

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
