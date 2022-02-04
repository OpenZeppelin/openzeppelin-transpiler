import _test, { TestFn } from 'ava';
import { getBuildInfo } from './test-utils/get-build-info';

import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from './solc/ast-utils';
import { SolcInput, SolcOutput } from './solc/input-output';
import { Transform } from './transform';

import { renameIdentifiers } from './transformations/rename-identifiers';
import { prependInitializableBase } from './transformations/prepend-initializable-base';
import { removeStateVarInits } from './transformations/purge-var-inits';
import { removeImmutable } from './transformations/remove-immutable';
import { removeInheritanceListArguments } from './transformations/remove-inheritance-list-args';
import { renameContractDefinition } from './transformations/rename-contract-definition';
import { fixImportDirectives } from './transformations/fix-import-directives';
import { fixNewStatement } from './transformations/fix-new-statement';
import { addRequiredPublicInitializer } from './transformations/add-required-public-initializers';
import { appendInitializableImport } from './transformations/append-initializable-import';
import { addStorageGaps } from './transformations/add-storage-gaps';
import {
  transformConstructor,
  removeLeftoverConstructorHead,
} from './transformations/transform-constructor';

const test = _test as TestFn<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transform: Transform;
  transformFile: (file: string) => Transform;
}

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.6');

  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output as SolcOutput;

  t.context.transformFile = (file: string) =>
    new Transform(t.context.solcInput, t.context.solcOutput, {
      exclude: source => source !== file,
    });
});

test.beforeEach('transform', async t => {
  t.context.transform = new Transform(t.context.solcInput, t.context.solcOutput, {
    exclude: source => source.startsWith('contracts/invalid/'),
  });
});

test('read', t => {
  const text = t.context.transform.read({ src: '0:6:0' });
  t.deepEqual('pragma', text);
});

test('apply + read', t => {
  t.context.transform.apply(function* () {
    yield { kind: 'a', start: 1, length: 0, text: '~' };
  });
  const text = t.context.transform.read({ src: '0:6:0' });
  t.deepEqual('p~ragma', text);
});

test('apply + read invalid', t => {
  t.context.transform.apply(function* () {
    yield { kind: 'a', start: 1, length: 2, text: '~~' };
  });

  t.throws(() => t.context.transform.read({ src: '2:2:0' }));
});

test('remove functions', t => {
  const file = 'contracts/TransformRemove.sol';
  t.context.transform.apply(function* (sourceUnit) {
    if (sourceUnit.absolutePath === file) {
      for (const node of findAll('FunctionDefinition', sourceUnit)) {
        yield { ...getNodeBounds(node), kind: 'remove', text: '' };
      }
    }
  });

  t.snapshot(t.context.transform.results()[file]);
});

test('rename identifiers', t => {
  const file = 'contracts/solc-0.6/Rename.sol';
  t.context.transform.apply(renameIdentifiers);
  t.snapshot(t.context.transform.results()[file]);
});

test('prepend Initializable base', t => {
  const file = 'contracts/solc-0.6/Rename.sol';
  t.context.transform.apply(prependInitializableBase);
  t.snapshot(t.context.transform.results()[file]);
});

test('purge var inits', t => {
  const file = 'contracts/solc-0.6/ElementaryTypes.sol';
  t.context.transform.apply(removeStateVarInits);
  t.snapshot(t.context.transform.results()[file]);
});

test('remove inheritance args', t => {
  const file = 'contracts/TransformInheritanceArgs.sol';
  t.context.transform.apply(removeInheritanceListArguments);
  t.snapshot(t.context.transform.results()[file]);
});

test('transform contract name', t => {
  const file = 'contracts/solc-0.6/Rename.sol';
  t.context.transform.apply(renameContractDefinition);
  t.snapshot(t.context.transform.results()[file]);
});

test('skip contract rename when Upgradeable suffix', t => {
  const file = 'contracts/solc-0.6/AlreadyUpgradeable.sol';
  t.context.transform.apply(renameContractDefinition);
  t.snapshot(t.context.transform.results()[file]);
});

test('fix import directives', t => {
  const file = 'contracts/solc-0.6/Local.sol';
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
  const file = 'contracts/solc-0.6/Local.sol';
  t.context.transform.apply(appendInitializableImport('contracts/solc-0.6/Initializable.sol'));
  t.snapshot(t.context.transform.results()[file]);
});

test('append initializable import custom', t => {
  const file = 'contracts/solc-0.6/Local.sol';
  t.context.transform.apply(appendInitializableImport('contracts/solc-0.6/Initializable2.sol'));
  t.snapshot(t.context.transform.results()[file]);
});

test('transform constructor', t => {
  const file = 'contracts/TransformConstructor.sol';
  t.context.transform.apply(transformConstructor);
  t.context.transform.apply(removeLeftoverConstructorHead);
  t.snapshot(t.context.transform.results()[file]);
});

test('invalid constructors', t => {
  const tVarSubexpr = t.context.transformFile(
    'contracts/invalid/TransformConstructorVarSubexpr.sol',
  );
  t.throws(() => tVarSubexpr.apply(transformConstructor), {
    message: `Can't transpile non-trivial expression in parent constructor argument (y + 1)`,
  });

  const tVarSubexprVar = t.context.transformFile(
    'contracts/invalid/TransformConstructorVarSubexprVar.sol',
  );
  t.throws(() => tVarSubexprVar.apply(transformConstructor), {
    message: `Can't transpile non-trivial expression in parent constructor argument (y + 1)`,
  });

  const tDupExpr = t.context.transformFile('contracts/invalid/TransformConstructorDupExpr.sol');
  t.throws(() => tDupExpr.apply(transformConstructor), {
    message: `Can't transpile non-trivial expression in parent constructor argument (t.mint())`,
  });
});

test('fix new statement', t => {
  const file = 'contracts/TransformNew.sol';
  t.context.transform.apply(fixNewStatement);
  t.context.transform.apply(addRequiredPublicInitializer([]));
  t.snapshot(t.context.transform.results()[file]);
});

test('exclude', t => {
  const file = 'contracts/TransformInitializable.sol';
  const transform = new Transform(t.context.solcInput, t.context.solcOutput, {
    exclude: s => s === file,
  });
  // eslint-disable-next-line require-yield
  transform.apply(function* (s) {
    t.not(s.absolutePath, file);
  });
  t.false(file in transform.results());
});

test('add storage gaps', t => {
  const file = 'contracts/TransformAddGap.sol';
  t.context.transform.apply(addStorageGaps);
  t.snapshot(t.context.transform.results()[file]);
});

test('add requested public initializer', t => {
  const file = 'contracts/TransformConstructorWithArgs.sol';
  t.context.transform.apply(addRequiredPublicInitializer([file]));
  t.snapshot(t.context.transform.results()[file]);
});

test('remove immutable', t => {
  const file = 'contracts/TransformImmutable.sol';
  t.context.transform.apply(removeImmutable);
  t.snapshot(t.context.transform.results()[file]);
});
