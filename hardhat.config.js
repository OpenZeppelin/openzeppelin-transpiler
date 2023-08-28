const { internalTask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT } = require('hardhat/builtin-tasks/task-names');

require('hardhat-ignore-warnings');

internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT, async (args, hre, runSuper) => {
  const input = await runSuper();
  input.settings.outputSelection['*']['*'].push('storageLayout');
  return input;
});

module.exports = {
  solidity: {
    compilers: ['0.6.7', '0.8.8', '0.8.20'].map(version => ({ version })),
  },
  warnings: 'off',
};
