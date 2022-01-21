import { SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { FunctionDefinition } from 'solidity-ast';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';
import { getInitializerItems } from './utils/get-initializer-items';

function getArgsList(constructor: FunctionDefinition, helper: TransformHelper): string {
  return helper.read(constructor.parameters).replace(/^\((.*)\)$/s, '$1');
}

// Removes parameters unused by the functions's body
function getUsedArguments(constructor: FunctionDefinition, helper: TransformHelper): string {
  // Get declared parameters information
  const parameters = constructor.parameters.parameters;

  if (!parameters?.length) {
    return '';
  } else {
    let result: string = getArgsList(constructor, helper);
    const usedIds = new Set(
      [...findAll('Identifier', constructor.body!)].map(i => i.referencedDeclaration),
    );

    for (const p of parameters) {
      // Check if parameter is used
      if (!usedIds.has(p.id)) {
        // Remove unused parameter
        result = result.replace(/\s+[a-z0-9$_]+/gi, m => (m.trim() === p.name ? '' : m));
      }
    }
    return result;
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
    const { constructorNode, modifiers, varInitNodes, empty: emptyConstructor } = getInitializerItems(contractNode);

    const initializer = (
      helper: TransformHelper,
      argsList = '',
      unchainedArgsList = '',
      argNames: string[] = [],
    ) => [
      `function __${name}_init(${argsList}) internal onlyInitializing {`,
      buildSuperCallsForChain2(contractNode, tools, helper),
      emptyConstructor ? [] : [`__${name}_init_unchained(${argNames.join(', ')});`],
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
          const unchainedArgsList = getUsedArguments(constructorNode, helper);

          return formatLines(
            1,
            initializer(helper, argsList, unchainedArgsList, argNames).slice(
              0,
              -1,
            ),
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
