import _test, { TestFn } from 'ava';

import { getBuildInfo } from './test-utils/get-build-info';

import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { removeStateVarInits } from './transformations/purge-var-inits';
import { addNamespaceStruct } from './transformations/add-namespace-struct';
import { addTransientSlots } from './transformations/add-transient-slots';
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
  const buildInfo = await getBuildInfo('0.8');

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
  transform.apply(addTransientSlots('contracts/utils/TransientSlot.sol', () => true));
  transform.apply(transformConstructor(() => true));
  transform.apply(removeLeftoverConstructorHead);
  transform.apply(removeStateVarInits);
  transform.apply(addNamespaceStruct(() => true));
  t.snapshot(transform.results()[file]);
});

test('error with @custom:storage-size', t => {
  const file = 'contracts/namespaces-error-storage-size.sol';
  const transform = t.context.transformFile(file);
  t.throws(() => transform.apply(addNamespaceStruct(() => true)), {
    message:
      'Cannot combine namespaces with @custom:storage-size annotations (contracts/namespaces-error-storage-size.sol:5)',
  });
});

for (const [name, file, message] of [
  [
    'unsupported transient type',
    'contracts/namespaces-error-transient-type.sol',
    "Unsupported transient variable type 'uint8' (supported: address, bool, bytes32, uint256, int256) (contracts/namespaces-error-transient-type.sol:5)",
  ],
  [
    'public transient variable',
    'contracts/namespaces-error-transient-public.sol',
    'Cannot transform a public transient variable: its getter would be lost (contracts/namespaces-error-transient-public.sol:5)',
  ],
  [
    'transient assignment used as a value',
    'contracts/namespaces-error-transient-value.sol',
    'Cannot transform an assignment to a transient variable whose value is used (contracts/namespaces-error-transient-value.sol:8)',
  ],
  [
    'inherited transient variable',
    'contracts/namespaces-error-transient-inherited.sol',
    'Transient variables must be declared in the contract that uses them (contracts/namespaces-error-transient-inherited.sol:10)',
  ],
] as const) {
  test(`error with ${name}`, t => {
    const transform = t.context.transformFile(file);
    t.throws(
      () => transform.apply(addTransientSlots('contracts/utils/TransientSlot.sol', () => true)),
      { message },
    );
  });
}
