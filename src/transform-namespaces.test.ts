import _test, { TestFn } from 'ava';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { addNamespaceStruct } from './transformations/add-namespace-struct';

const test = _test as TestFn<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transform: Transform;
}

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.8.20');

  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output as SolcOutput;
});

test.beforeEach('transform', async t => {
  t.context.transform = new Transform(t.context.solcInput, t.context.solcOutput);
});

test('add namespace', t => {
  const file = 'contracts/namespaces.sol';
  t.context.transform.apply(addNamespaceStruct);
  t.snapshot(t.context.transform.results()[file]);
});
