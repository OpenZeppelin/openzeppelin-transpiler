#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
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
  const contracts = artifacts.map(a => a.contractName);
  const transpiled = transpileContracts(contracts, artifacts, 'contracts');

  const outDir = 'contracts/upgradeable';
  await fs.mkdir(outDir, { recursive: true });

  await Promise.all(transpiled.map(t =>
    fs.writeFile(path.join(outDir, t.fileName), t.source)
  ));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
