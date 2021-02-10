import _test, { TestInterface } from 'ava';
import hre from 'hardhat';
import { promises as fs } from 'fs';
import path from 'path';
import { mapValues, pick } from 'lodash';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { generateWithInit } from './generate-with-init';

const test = _test as TestInterface<Context>;

interface Context {
  solcInputOutput(...paths: string[]): [SolcInput, SolcOutput];
}

test.before('gather solc input output', async t => {
  const buildinfo = path.join(hre.config.paths.artifacts, 'build-info');
  const filenames = await fs.readdir(buildinfo)
  t.deepEqual(filenames.length, 1);
  const filepath = path.join(buildinfo, filenames[0]);
  const { input: solcInput, output: solcOutput } = JSON.parse(await fs.readFile(filepath, 'utf8'));

  t.context.solcInputOutput = (...paths) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [solcInput, solcOutput].map(x => mapValues(x, y => pick(y, paths))) as any;
  };
});

test('simple', t => {
  const transform = new Transform(...t.context.solcInputOutput('contracts/GenerateWithInit.sol'));
  t.snapshot(generateWithInit(transform, 'contracts/WithInit.sol'));
});
