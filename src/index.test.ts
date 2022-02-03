import _test, { TestFn } from 'ava';
import hre from 'hardhat';

import { getBuildInfo } from './test-utils/get-build-info';
import { TranspileOptions } from './index';
import { OutputFile, transpile } from '.';
import { SolcOutput } from './solc/input-output';

const test = _test as TestFn<Context>;

interface Context {
  files: OutputFile[];
}

const fileNames = [
  'ClassInheritance.sol',
  'Override.sol',
  'DiamondInheritance.sol',
  'Deep.sol',
  'ElementaryTypes.sol',
  'ElementaryTypesWithConstructor.sol',
  'Imported.sol',
  'Local.sol',
  'SimpleInheritance.sol',
  'StringConstructor.sol',
  'Library.sol',
  'AbstractContract.sol',
  'Interface.sol',
  'Rename.sol',
];

const excludeSet = [
  'contracts/invalid/InvalidTransformConstructor.sol',
  'contracts/invalid/InvalidTransformConstructorFunction.sol',
];

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.6');
  const solcInput = buildInfo.input;
  const solcOutput = buildInfo.output as SolcOutput;
  const options: TranspileOptions = { exclude: excludeSet };

  t.context.files = await transpile(solcInput, solcOutput, hre.config.paths, options);
});

for (const fileName of fileNames) {
  test(fileName, t => {
    const file = t.context.files.find(f => f.fileName === fileName);
    t.not(file, undefined, 'file not found');
    t.snapshot(file);
  });
}

test('AlreadyUpgradeable.sol', t => {
  const file = t.context.files.find(f => f.fileName === 'AlreadyUpgradeable.sol');
  t.is(file, undefined);
});
