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
  helper: TransformHelper,
  initCalls?: string[],
): string {
  // Get declared parameters information
  const parameters = constructor.parameters.parameters;
  let result: string = getArgsList(constructor, helper);

  if (parameters?.length) {
    let found: boolean;
    const usedIds = new Set(
      [...findAll('Identifier', constructor.body!)].map(i => i.referencedDeclaration),
    );

    for (const p of parameters) {
      found = false;
      // Check if parameter is used
      if (initCalls) {
        // Gets all variables used by unchained calls without including the delimiters
        const usedVariables = initCalls.join().match(/(?<=[(,\s])(.*?)(?=[),])+/gi);

        // If the init method is empty none of the parameters will be used
        if (initCalls.length > 0 && usedVariables) {
          found = usedVariables.includes(p.name);
        }
      } else {
        found = usedIds.has(p.id);
      }

      if (!found) {
        // Remove unused parameter
        result = result.replace(/\s+[a-z0-9$_]+/gi, m => (m.trim() === p.name ? '' : m));
      }
    }
  } else {
    return '';
  }

  return result;
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
      const hasStatements =
        (constructorNode.body?.statements?.length ?? 0) > 0 ||
        modifiers.length > 0 ||
        varInitNodes.length > 0;

      const unchainedCall = hasStatements
        ? [`__${name}_init_unchained(${argNames.join(', ')});`]
        : [];

      yield {
        start: bodyStart + 1,
        length: 0,
        kind: 'transform-constructor',
        transform: (_, helper) => {
          const superCalls = buildSuperCallsForChain2(contractNode, tools, helper);
          const initCalls = superCalls.concat(unchainedCall);
          const argsList = getUsedArguments(constructorNode, helper, initCalls);
          const unchainedArgsList = getUsedArguments(constructorNode, helper);

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
      const hasStatements = varInitNodes.length > 0;

      const unchainedCall = hasStatements ? [`__${name}_init_unchained();`] : [];

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
