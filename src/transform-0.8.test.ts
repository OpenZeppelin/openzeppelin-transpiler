import _test, { TestInterface } from 'ava';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { renameIdentifiers } from './transformations/rename-identifiers';

const test = _test as TestInterface<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transform: Transform;
}

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.8');

  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output as SolcOutput;
});

test.beforeEach('transform', async t => {
  t.context.transform = new Transform(t.context.solcInput, t.context.solcOutput);
});

test('rename parents in solidity 0.8', t => {
  const file = 'contracts/rename-0.8.sol';
  t.context.transform.apply(renameIdentifiers);
  t.snapshot(t.context.transform.results()[file]);
});

test('correctly index when utf8 characters', t => {
  const file = 'contracts/TransformUtf8Chars.sol';
  t.context.transform.apply(renameIdentifiers);
  t.snapshot(t.context.transform.results()[file]);
});
