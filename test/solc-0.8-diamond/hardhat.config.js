const { internalTask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT } = require('hardhat/builtin-tasks/task-names');

internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT, async (args, hre, runSuper) => {
  const input = await runSuper();
  input.settings.outputSelection['*']['*'].push('storageLayout');
  return input;
});

module.exports = {
  solidity: {
    version: '0.8.2',
  },
};
