import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getSourceIndices, getNodeSources, getNodeBounds } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function* prependInitializableBase(
  sourceUnit: SourceUnit,
  _: unknown,
  original: string,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    if (contract.contractKind !== 'contract') {
      continue;
    }

    if (contract.baseContracts.length > 0) {
      const [start] = getSourceIndices(contract.baseContracts[0]);
      yield {
        kind: 'prepend-initializable-base',
        start,
        length: 0,
        text: `Initializable, `,
      };
    } else {
      const bounds = getNodeBounds(contract);
      const re = /(?:abstract\s+)?contract\s+([a-zA-Z0-9$_]+)/y;
      re.lastIndex = bounds.start;
      const match = re.exec(original);

      if (match === null) {
        throw new Error(`Can't find ${contract.name} in ${sourceUnit.absolutePath}`);
      }

      const start = match.index + match[0].length;

      yield {
        start,
        length: 0,
        kind: 'prepend-initializable-base',
        text: ' is Initializable',
      };
    }
  }
}

export function* prependBaseClass(
  contractNode: ContractDefinition,
  source: string,
  cls: string,
): Generator<Transformation> {
  if (contractNode.contractKind !== 'contract') {
    return;
  }

  if (contractNode.baseContracts.length > 0) {
    const [start] = getSourceIndices(contractNode.baseContracts[0]);
    yield {
      kind: 'prepend-base-class',
      start,
      length: 0,
      text: `${cls}, `,
    };
  } else {
    const re = new RegExp(`^(abstract\\s+)?contract\\s+${contractNode.name}\\b`);
    const [contractStart, , contractSource] = getNodeSources(contractNode, source);
    const match = re.exec(contractSource);

    if (!match) {
      throw new Error(`Can't find ${contractNode.name} in ${contractSource}`);
    }

    yield {
      kind: 'prepend-base-class',
      start: contractStart + match.index + match[0].length,
      length: 0,
      text: ` is ${cls}`,
    };
  }
}
