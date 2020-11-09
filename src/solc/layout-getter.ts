import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { SolcOutput, StorageLayout } from './input-output';

export type LayoutGetter = (c: ContractDefinition) => StorageLayout;

export function layoutGetter(output: SolcOutput): LayoutGetter {
  const map = new Map<number, StorageLayout | undefined>();

  for (const file in output.sources) {
    const { ast } = output.sources[file];
    for (const contract of findAll('ContractDefinition', ast)) {
      map.set(contract.id, output.contracts[file][contract.name].storageLayout);
    }
  }

  return c => {
    const layout = map.get(c.id);
    if (layout === undefined) {
      throw new Error(`Storage layout for contract ${c.name} unavailable`);
    }
    return layout;
  };
}
