import _test, { TestFn } from 'ava';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { renameIdentifiers } from './transformations/rename-identifiers';
import { removeImmutable } from './transformations/remove-immutable';
import { removeStateVarInits } from './transformations/purge-var-inits';
import {
  removeLeftoverConstructorHead,
  transformConstructor,
} from './transformations/transform-constructor';
import { renameInheritdoc } from './transformations/rename-inheritdoc';

const test = _test as TestFn<Context>;

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
  t.context.transform.apply(renameInheritdoc);
  t.snapshot(t.context.transform.results()[file]);
});

test('correctly index when utf8 characters', t => {
  const file = 'contracts/TransformUtf8Chars.sol';
  t.context.transform.apply(renameIdentifiers);
  t.snapshot(t.context.transform.results()[file]);
});

test('preserves immutable if allowed', t => {
  const file = 'contracts/TransformAllowedImmutable.sol';
  t.context.transform.apply(transformConstructor());
  t.context.transform.apply(removeLeftoverConstructorHead);
  t.context.transform.apply(removeStateVarInits);
  t.context.transform.apply(removeImmutable);
  t.snapshot(t.context.transform.results()[file]);
});
