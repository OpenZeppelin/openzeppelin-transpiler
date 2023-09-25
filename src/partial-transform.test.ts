import _test, { TestFn } from 'ava';
import hre from 'hardhat';

import { getBuildInfo } from './test-utils/get-build-info';
import { OutputFile, transpile } from '.';
import { SolcOutput } from './solc/input-output';

const test = _test as TestFn<Context>;

interface Context {
  files: OutputFile[];
}

const projectDir = 'contracts/project';
const peerProject = '@openzeppelin/test/..';

test.serial.before('compile', async t => {
  const buildInfo = await getBuildInfo('0.8');
  const solcInput = buildInfo.input;
  const solcOutput = buildInfo.output as SolcOutput;
  const exclude = Object.keys(solcOutput.sources).filter(path => !path.startsWith(projectDir));

  t.context.files = await transpile(solcInput, solcOutput, hre.config.paths, {
    exclude,
    peerProject,
  });
});

for (const fileName of ['ISomeInterface.sol', 'SomeLibrary.sol']) {
  test(`do not transpile ${fileName}`, t => {
    const file = t.context.files.find(f => f.fileName === fileName);
    t.is(file, undefined, 'file should not be transpiled');
  });
}

for (const fileName of ['SomeContract.sol', 'SomeOtherContract.sol']) {
  test(`transpile ${fileName}`, t => {
    const file = t.context.files.find(f => f.fileName === fileName);
    t.not(file, undefined, 'file not found');
    t.snapshot(file);
  });
}
