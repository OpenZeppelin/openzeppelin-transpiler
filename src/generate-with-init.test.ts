import _test, { TestFn } from 'ava';
import { mapValues, pick } from 'lodash';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { generateWithInit } from './generate-with-init';

const test = _test as TestFn<Context>;

interface Context {
  solcInputOutput(...paths: string[]): [SolcInput, SolcOutput];
}

test.before('gather solc input output', async t => {
  const buildInfo = await getBuildInfo('0.6');
  const solcInput = buildInfo.input;
  const solcOutput = buildInfo.output as SolcOutput;

  t.context.solcInputOutput = (...paths) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [solcInput, solcOutput].map(x => mapValues(x, y => pick(y, paths))) as any;
  };
});

test('simple', t => {
  const transform = new Transform(...t.context.solcInputOutput('contracts/GenerateWithInit.sol'));
  t.snapshot(generateWithInit(transform, 'contracts/WithInit.sol'));
});
