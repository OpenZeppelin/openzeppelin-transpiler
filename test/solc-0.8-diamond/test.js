const test = require('ava');
const path = require('path');
const { promises: fs } = require('fs');

const { transpile } = require('../..');

process.chdir(__dirname);
const hre = require('hardhat');

test.serial.before('compile', async () => {
  await hre.run('compile');
});

test.before('transpile', async t => {
  const buildinfo = path.join(hre.config.paths.artifacts, 'build-info');
  const filenames = await fs.readdir(buildinfo);
  t.deepEqual(filenames.length, 1);
  const filepath = path.join(buildinfo, filenames[0]);
  const { input: solcInput, output: solcOutput } = JSON.parse(await fs.readFile(filepath, 'utf8'));
  t.context.files = await transpile(solcInput, solcOutput, hre.config.paths);
  console.log(t.context.files)
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
