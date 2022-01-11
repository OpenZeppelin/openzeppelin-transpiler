import _test, { TestInterface } from 'ava';

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

const test = _test as TestInterface<Context>;

interface Context {
  solcInput: SolcInput;
  solcOutput: SolcOutput;
  transform: Transform;
}

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.6');

  t.context.solcInput = buildInfo.input;
  t.context.solcOutput = buildInfo.output as SolcOutput;
});

test.beforeEach('transform', async t => {
  t.context.transform = new Transform(t.context.solcInput, t.context.solcOutput);
});

test('transform constructor', t => {
  const file = 'contracts/ConstructorUpdates.sol';
  t.context.transform.apply(transformConstructor);
  t.context.transform.apply(removeLeftoverConstructorHead);
  //t.snapshot(t.context.transform.results()[file]);
  t.pass();
});
