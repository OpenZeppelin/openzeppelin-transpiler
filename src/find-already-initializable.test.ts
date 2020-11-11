import _test, { TestInterface } from 'ava';
import { promises as fs } from 'fs';
import path from 'path';
import bre from '@nomiclabs/buidler';

import { SolcOutput } from './solc/input-output';
import { findAlreadyInitializable } from './find-already-initializable';

const test = _test as TestInterface<Context>;

interface Context {
  solcOutput: SolcOutput;
}

test.serial.before('compile', async t => {
  t.context.solcOutput = JSON.parse(
    await fs.readFile(path.join(bre.config.paths.cache, 'solc-output.json'), 'utf8'),
  );
});

test('ok', t => {
  const alreadyInit = findAlreadyInitializable(
    t.context.solcOutput,
    'contracts/find-already-init/Init1.sol',
  );
  t.deepEqual(['contracts/find-already-init/AlreadyOk.sol'], alreadyInit);
});

test('mixed', t => {
  t.throws(
    () => findAlreadyInitializable(t.context.solcOutput, 'contracts/find-already-init/Init2.sol'),
    { message: /contains both Initializable and non-Initializable/ },
  );
});

test('no Initializable contract', t => {
  t.throws(
    () => findAlreadyInitializable(t.context.solcOutput, 'contracts/find-already-init/NoInit.sol'),
    { message: /does not contain Initializable/ },
  );
});

test('more than Initializable contract', t => {
  t.throws(
    () =>
      findAlreadyInitializable(t.context.solcOutput, 'contracts/find-already-init/InitPlus.sol'),
    { message: /contains contracts other than Initializable/ },
  );
});
