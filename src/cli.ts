#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import 'source-map-support/register';

import { transpileContracts } from '.';
import { Artifact } from './solc/artifact';

async function readArtifacts(): Promise<Artifact[]> {
  const dir = 'build/contracts';
  const names = await fs.readdir(dir);
  return await Promise.all(names.map(async n => 
    JSON.parse(await fs.readFile(path.join(dir, n), 'utf8'))
  ));
}

async function main() {
  const artifacts = await readArtifacts();
  const transpiled = transpileContracts(artifacts, 'contracts');

  await Promise.all(transpiled.map(async t => {
    await fs.mkdir(path.dirname(t.path), { recursive: true });
    await fs.writeFile(t.path, t.source);
  }));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
