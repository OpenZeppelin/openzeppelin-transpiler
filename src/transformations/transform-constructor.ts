import {ContractDefinition, SourceUnit, VariableDeclaration, VariableDeclarationStatement} from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';
import { getVarStorageName } from "./utils/get-var-storage-name";
import { getScopedContractsForVariables } from "./utils/get-identifiers-used";

export function* removeLeftoverConstructorHead(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (hasConstructorOverride(contractNode)) {
      continue;
    }

    const constructorNode = getConstructor(contractNode);
    if (constructorNode) {
      const { start: ctorStart } = getNodeBounds(constructorNode);
      const { start: bodyStart } = getNodeBounds(constructorNode.body!);
      yield {
        start: ctorStart,
        length: bodyStart + 1 - ctorStart,
        kind: 'remove-leftover-constructor',
        text: '',
      };
    }
  }
}

export function* transformConstructor(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (contractNode.contractKind !== 'contract' || hasConstructorOverride(contractNode)) {
      continue;
    }

    const { name } = contractNode;

    const constructorNode = getConstructor(contractNode);

    const varInitNodes = [...findAll('VariableDeclaration', contractNode)].filter(
      v =>
        v.stateVariable && v.value && !v.constant && !hasOverride(v, 'state-variable-assignment'),
    );

    const initializer = (helper: TransformHelper, argsList = '', argNames: string[] = []) => [
      `function __${name}_init(${argsList}) internal onlyInitializing {`,
      buildSuperCallsForChain2(contractNode, tools, helper),
      [`__${name}_init_unchained(${argNames.join(', ')});`],
      `}`,
      ``,
      `function __${name}_init_unchained(${argsList}) internal onlyInitializing {`,
      varInitNodes.map(v => `${getVarStorageName(v, tools) + v.name} = ${helper.read(v.value!)};`),
      `}`,
    ];

    const usingLines = createUsingLines(contractNode, tools);
    if (constructorNode) {
      const { start: bodyStart } = getNodeBounds(constructorNode.body!);
      const argNames = constructorNode.parameters.parameters.map(p => p.name);

      yield {
        start: bodyStart + 1,
        length: 0,
        kind: 'transform-constructor',
        transform: (_, helper) => {
          const argsList = helper.read(constructorNode.parameters).replace(/^\((.*)\)$/s, '$1');
          return formatLines(1, initializer(helper, argsList, argNames).slice(0, -1)).trim();
        },
      };

      const start = newFunctionPosition(contractNode, tools);
      yield {
        start,
        length: 0,
        kind: 'add-using-lines',
        text: usingLines,
      };

    } else {
      const start = newFunctionPosition(contractNode, tools);

      yield {
        start,
        length: 0,
        kind: 'add-initializers',
        transform: (source, helper) => {
          return usingLines + formatLines(1, initializer(helper)) }
      };
    }
  }
}

function createUsingLines(contract: ContractDefinition, tools: TransformerTools): string {
  const contractsAccessed = getScopedContractsForVariables(contract, tools);

  let usingLines = '';

  contractsAccessed.forEach( contractNode => {
      usingLines += `    using ${contractNode.name}Storage for ${contractNode.name}Storage.Layout;\n`;
  });

  return usingLines;
}
