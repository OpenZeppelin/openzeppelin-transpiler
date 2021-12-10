import { SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasOverride } from '../utils/upgrades-overrides';

export function* removeLeftoverConstructorHead(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
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
    if (contractNode.contractKind !== 'contract') {
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
      varInitNodes.map(v => `${v.name} = ${helper.read(v.value!)};`),
      `}`,
    ];

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
    } else {
      const start = newFunctionPosition(contractNode, tools);

      yield {
        start,
        length: 0,
        kind: 'transform-constructor',
        transform: (source, helper) => formatLines(1, initializer(helper)),
      };
    }
  }
}
