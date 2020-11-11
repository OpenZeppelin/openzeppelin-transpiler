import { findAll } from 'solidity-ast/utils';

import { SolcOutput } from './solc/input-output';

export function findAlreadyInitializable(
  solcOutput: SolcOutput,
  initializablePath?: string,
): string[] {
  if (initializablePath === undefined) {
    return [];
  }

  const initSourceUnit = solcOutput.sources[initializablePath]?.ast;

  if (initSourceUnit === undefined) {
    throw new Error(`File ${initializablePath} is not found or has not been compiled`);
  }

  const [initContract, ...otherContracts] = findAll('ContractDefinition', initSourceUnit);

  if (otherContracts.length > 0) {
    throw new Error(`File ${initializablePath} contains contracts other than Initializable`);
  }

  if (initContract === undefined || initContract.name !== 'Initializable') {
    throw new Error(`File ${initializablePath} does not contain Initializable`);
  }

  const initializableSources = [];

  for (const source in solcOutput.sources) {
    if (source === initializablePath) {
      continue;
    }

    const { ast } = solcOutput.sources[source];
    const initializable = new Set<boolean>();

    for (const contract of findAll('ContractDefinition', ast)) {
      if (contract.linearizedBaseContracts.includes(initContract.id)) {
        initializable.add(true);
      } else if (contract.contractKind === 'contract') {
        initializable.add(false);
      }
    }

    if (initializable.has(true)) {
      if (initializable.has(false)) {
        throw new Error(
          `File ${source} contains both Initializable and non-Initializable contracts`,
        );
      } else {
        initializableSources.push(source);
      }
    }
  }

  return initializableSources;
}
