import _test, { TestInterface } from 'ava';
import bre from '@nomiclabs/buidler';
import { promises as fs } from 'fs';
import path from 'path';

import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from './solc/ast-utils';
import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { renameIdentifiers } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-initializable-base';
import { removeStateVarInits } from './transformations/purge-var-inits';
import { removeInheritanceListArguments } from './transformations/remove-inheritance-list-args';
import { renameContractDefinition } from './transformations/rename-contract-definition';
import { fixImportDirectives } from './transformations/fix-import-directives';
import { appendInitializableImport } from './transformations/append-initializable-import';
import {
  transformConstructor,
  removeLeftoverConstructorHead,
} from './transformations/transform-constructor';

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

test('apply + read', t => {
  t.context.transform.apply(function*() {
    yield { kind: 'a', start: 1, length: 0, text: '~' };
  });
  const text = t.context.transform.read({ src: '0:6:0' });
  t.deepEqual('p~ragma', text);
});

test('apply + read invalid', t => {
  t.context.transform.apply(function*() {
    yield { kind: 'a', start: 1, length: 2, text: '~~' };
  });

  t.throws(() => t.context.transform.read({ src: '2:2:0' }));
});

test('remove functions', t => {
  const file = 'contracts/TransformRemove.sol';
  t.context.transform.apply(function*(sourceUnit) {
    if (sourceUnit.absolutePath === file) {
      for (const node of findAll('FunctionDefinition', sourceUnit)) {
        yield { ...getNodeBounds(node), kind: 'remove', text: '' };
      }
    }
  });

  t.snapshot(t.context.transform.results()[file]);
});

test('rename identifiers', t => {
  const file = 'test/solc-0.6/contracts/Rename.sol';
  t.context.transform.apply(renameIdentifiers);
  t.snapshot(t.context.transform.results()[file]);
});

test('prepend Initializable base', t => {
  const file = 'test/solc-0.6/contracts/Rename.sol';
  t.context.transform.apply(prependInitializableBase);
  t.snapshot(t.context.transform.results()[file]);
});

test('purge var inits', t => {
  const file = 'test/solc-0.6/contracts/ElementaryTypes.sol';
  t.context.transform.apply(removeStateVarInits);
  t.snapshot(t.context.transform.results()[file]);
});

test('remove inheritance args', t => {
  const file = 'contracts/TransformInheritanceArgs.sol';
  t.context.transform.apply(removeInheritanceListArguments);
  t.snapshot(t.context.transform.results()[file]);
});

test('transform contract name', t => {
  const file = 'test/solc-0.6/contracts/Rename.sol';
  t.context.transform.apply(renameContractDefinition);
  t.snapshot(t.context.transform.results()[file]);
});

test('fix import directives', t => {
  const file = 'test/solc-0.6/contracts/Local.sol';
  t.context.transform.apply(fixImportDirectives);
  t.snapshot(t.context.transform.results()[file]);
});

test('fix import directives complex', t => {
  const file = 'contracts/TransformImport2.sol';
  t.context.transform.apply(renameIdentifiers);
  t.context.transform.apply(fixImportDirectives);
  t.snapshot(t.context.transform.results()[file]);
});

test('append initializable import', t => {
  const file = 'test/solc-0.6/contracts/Local.sol';
  t.context.transform.apply((...args) =>
    appendInitializableImport('test/solc-0.6/contracts', ...args),
  );
  t.snapshot(t.context.transform.results()[file]);
});

test('transform constructor', t => {
  const file = 'contracts/TransformConstructor.sol';
  t.context.transform.apply(transformConstructor);
  t.context.transform.apply(removeLeftoverConstructorHead);
  t.snapshot(t.context.transform.results()[file]);
});

test('exclude', t => {
  const transform = new Transform(t.context.solcInput, t.context.solcOutput, ['Foo', 'Bar']);
  const file = 'contracts/TransformInitializable.sol';
  transform.apply(prependInitializableBase);
  t.snapshot(transform.results()[file]);
});

test('exclude error', t => {
  const transform = new Transform(t.context.solcInput, t.context.solcOutput, ['Foo']);
  t.throws(
    () => transform.apply(transformConstructor),
    undefined,
    'Foo inherits a contract that was excluded from transpilation',
  );
});
