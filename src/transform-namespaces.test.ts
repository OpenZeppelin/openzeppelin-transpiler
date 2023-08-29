import _test, { TestFn } from 'ava';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { removeStateVarInits } from './transformations/purge-var-inits';
import { addNamespaceStruct } from './transformations/add-namespace-struct';
import {
  removeLeftoverConstructorHead,
  transformConstructor,
} from './transformations/transform-constructor';

const test = _test as TestFn<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transformFile: (file: string) => Transform;
}

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.8.20');

  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output as SolcOutput;
});

test.beforeEach('transform', async t => {
  t.context.transformFile = (file: string) =>
    new Transform(t.context.solcInput, t.context.solcOutput, {
      exclude: source => source !== file,
    });
});

test('add namespace', t => {
  const file = 'contracts/namespaces.sol';
  const transform = t.context.transformFile(file);
  transform.apply(transformConstructor(() => true));
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(removeStateVarInits);
  transform.apply(addNamespaceStruct(() => true));
  t.snapshot(transform.results()[file]);
});

test('error with @custom:storage-size', t => {
  const file = 'contracts/namespaces-error-storage-size.sol';
  const transform = t.context.transformFile(file);
  t.throws(
    () => transform.apply(addNamespaceStruct(() => true)),
    { message: 'Cannot combine namespaces with @custom:storage-size annotations (contracts/namespaces-error-storage-size.sol:5)' },
  );
});
