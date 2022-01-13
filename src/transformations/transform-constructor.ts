import { SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { FunctionDefinition, VariableDeclaration } from 'solidity-ast';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

function getArgsList(constructor: FunctionDefinition, helper: TransformHelper): string {
  return helper.read(constructor.parameters).replace(/^\((.*)\)$/s, '$1');
}

// Removes parameters unused by the constructor's body
function getUnchainedArguments(constructor: FunctionDefinition, helper: TransformHelper): string {
  const parameters = constructor.parameters.parameters;

  if (parameters?.length) {
    const identifiersIds = new Set(
      [...findAll('Identifier', constructor.body!)].map(i => i.referencedDeclaration),
    );
    let result: string = getArgsList(constructor, helper);

    for (const p of parameters) {
      // Check if parameter is used
      const found = identifiersIds.has(p.id);
      if (!found) {
        // Remove unused parameter
        result = result.replace(/\s+[a-z0-9$_]+/gi, m => (m.trim() === p.name ? '' : m));
      }
    });

    return result;
  } else {
    return '';
  }
}

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

    const initializer = (
      helper: TransformHelper,
      argsList = '',
      unchainedArgsList = '',
      argNames: string[] = [],
    ) => [
      `function __${name}_init(${argsList}) internal onlyInitializing {`,
      buildSuperCallsForChain2(contractNode, tools, helper),
      [`__${name}_init_unchained(${argNames.join(', ')});`],
      `}`,
      ``,
      `function __${name}_init_unchained(${unchainedArgsList}) internal onlyInitializing {`,
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
          const argsList = getArgsList(constructorNode, helper);
          const unchainedArgsList = getUnchainedArguments(constructorNode, helper);

          return formatLines(
            1,
            initializer(helper, argsList, unchainedArgsList, argNames).slice(0, -1),
          ).trim();
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
