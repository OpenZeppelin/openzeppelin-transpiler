const test = require('ava');
const path = require('path');
const { promises: fs } = require('fs');

const { transpile } = require('../..');

process.chdir(__dirname);
const bre = require('hardhat');

test.serial.before('compile', async () => {
  await bre.run('compile');
});

test.before('transpile', async t => {
  const solcInputPath = path.join(bre.config.paths.cache, 'solc-input.json');
  const solcInput = JSON.parse(await fs.readFile(solcInputPath, 'utf8'));
  const solcOutputPath = path.join(bre.config.paths.cache, 'solc-output.json');
  const solcOutput = JSON.parse(await fs.readFile(solcOutputPath, 'utf8'));
  t.context.files = await transpile(solcInput, solcOutput, bre.config.paths);
});

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
