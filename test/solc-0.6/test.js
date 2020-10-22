const test = require('ava');
const fs = require('fs');

const { transpileContracts } = require('../..');

test.before('artifacts', t => {
  t.context.artifacts = fs.readdirSync(`${__dirname}/build/contracts`).map(file => {
    return JSON.parse(fs.readFileSync(`${__dirname}/build/contracts/${file}`, 'utf8'));
  });
});

test.before('transpile', t => {
  t.context.files = transpileContracts(t.context.artifacts, './contracts/');
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

test('AlreadyUpgradeSafe.sol', t => {
  const file = t.context.files.find(f => f.fileName === 'AlreadyUpgradeSafe.sol');
  t.is(file, undefined);
});
