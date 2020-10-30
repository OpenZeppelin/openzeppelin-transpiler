import _test, { TestInterface } from 'ava';
import bre from '@nomiclabs/buidler';
import { promises as fs } from 'fs';
import path from 'path';

import { findAll } from 'solidity-ast/utils';
import { getSourceIndices } from './solc/ast-utils';
import { SolcInput, SolcOutput } from './solc/output';
import { Transform } from './transform';

const test = _test as TestInterface<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transform: Transform;
}

test.serial.before('compile', async t => {
  await bre.run('compile');
  t.context.solcInput = JSON.parse(
    await fs.readFile(path.join(bre.config.paths.cache, 'solc-input.json'), 'utf8'),
  );
  t.context.solcOutput = JSON.parse(
    await fs.readFile(path.join(bre.config.paths.cache, 'solc-output.json'), 'utf8'),
  );
});

test.beforeEach('transform', async t => {
  t.context.transform = new Transform(t.context.solcInput, t.context.solcOutput);
});

test('read', t => {
  const text = t.context.transform.read({ src: '0:6:0' });
  t.deepEqual('pragma', text);
});

test('transform + read', t => {
  t.context.transform.apply(function*() {
    yield { kind: 'a', start: 1, length: 0, text: '~' };
  });
  const text = t.context.transform.read({ src: '0:6:0' });
  t.deepEqual('p~ragma', text);
});

test('transform + read invalid', t => {
  t.context.transform.apply(function*() {
    yield { kind: 'a', start: 1, length: 2, text: '~~' };
  });

  t.throws(() => t.context.transform.read({ src: '2:2:0' }));
});

test('transform remove functions', t => {
  const file = 'contracts/TransformRemove.sol';
  t.context.transform.apply(function*(sourceUnit) {
    if (sourceUnit.absolutePath === file) {
      for (const node of findAll('FunctionDefinition', sourceUnit)) {
        const [start, length] = getSourceIndices(node);
        yield { start, length, kind: 'remove', text: '' };
      }
    }
  });

  t.snapshot(t.context.transform.results()[file]);
});
