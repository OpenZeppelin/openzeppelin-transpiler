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

function getArgsList(constructor: FunctionDefinition, helper: TransformHelper): string {
  return helper.read(constructor.parameters).replace(/^\((.*)\)$/s, '$1');
}

// Removes parameters unused by the functions's body
function getUsedArguments(
  constructor: FunctionDefinition,
  where: 'body' | 'body+modifiers',
  helper: TransformHelper,
): string {
  // Get declared parameters information
  const parameters = constructor.parameters.parameters;

  if (!parameters?.length) {
    return '';
  } else {
    let result: string = getArgsList(constructor, helper);
    const usedIds = new Set(
      [...findAll('Identifier', where === 'body' ? constructor.body : constructor)]
      .map(i => i.referencedDeclaration),
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
    console.log('contract', name);
    const constructorNode = getConstructor(contractNode);

    const varInitNodes = [...findAll('VariableDeclaration', contractNode)].filter(
      v =>
        v.stateVariable && v.value && !v.constant && !hasOverride(v, 'state-variable-assignment'),
    );

    const initializer = (
      helper: TransformHelper,
      argsList = '',
      superCalls: string[] = [],
      unchainedArgsList = '',
      unchainedCall: string[] = [],
    ) => [
      `function __${name}_init(${argsList}) internal onlyInitializing {`,
      superCalls,
      unchainedCall,
      `}`,
      ``,
      `function __${name}_init_unchained(${unchainedArgsList}) internal onlyInitializing {`,
      varInitNodes.map(v => `${v.name} = ${helper.read(v.value!)};`),
      `}`,
    ];

    if (constructorNode) {
      const { start: bodyStart } = getNodeBounds(constructorNode.body!);
      const argNames = constructorNode.parameters.parameters.map(p => p.name);
      const parents = contractNode.linearizedBaseContracts;
      const modifiers = [];
      // we only include modifiers that don't reference base contracts
      for (const call of constructorNode.modifiers) {
        const { referencedDeclaration } = call.modifierName;
        if (referencedDeclaration != null && !parents.includes(referencedDeclaration)) {
          //is a modifier and not a parent contract call
          modifiers.push({ call });
        }
      }
      const nonEmptyConstructor =
        (constructorNode.body?.statements?.length ?? 0) > 0 ||
        modifiers.length > 0 ||
        varInitNodes.length > 0;

      const unchainedCall = nonEmptyConstructor
        ? [`__${name}_init_unchained(${argNames.join(', ')});`]
        : [];

      yield {
        start: bodyStart + 1,
        length: 0,
        kind: 'transform-constructor',
        transform: (_, helper) => {
          const superCalls = buildSuperCallsForChain2(contractNode, tools, helper);
          const argsList = getUsedArguments(constructorNode, 'body+modifiers', helper);
          const unchainedArgsList = getUsedArguments(constructorNode, 'body', helper);

          return formatLines(
            1,
            initializer(helper, argsList, superCalls, unchainedArgsList, unchainedCall).slice(
              0,
              -1,
            ),
          ).trim();
        },
      };
    } else {
      const start = newFunctionPosition(contractNode, tools);
      const nonEmptyConstructor = varInitNodes.length > 0;

      const unchainedCall = nonEmptyConstructor ? [`__${name}_init_unchained();`] : [];

      yield {
        start,
        length: 0,
        kind: 'transform-constructor',
        transform: (source, helper) =>
          formatLines(1, initializer(helper, '', [], '', unchainedCall)),
      };
    }
  }
}
