import { ModifierInvocation, SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { FunctionDefinition, Identifier } from 'solidity-ast';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride } from '../utils/upgrades-overrides';
import { getInitializerItems } from './utils/get-initializer-items';
import { parseNewExpression } from '../utils/new-expression';
import { getNamespaceStructName } from './add-namespace-struct';
import { ASTResolver } from '../ast-resolver';
import { isStorageVariable } from './utils/is-storage-variable';

function getArgsList(constructor: FunctionDefinition, helper: TransformHelper): string {
  return helper.read(constructor.parameters).replace(/^\((.*)\)$/s, '$1');
}

// Removes parameters unused by the constructor's body
function getUnchainedArguments(
  constructor: FunctionDefinition,
  helper: TransformHelper,
  modifiers: ModifierInvocation[],
): string {
  // Get declared parameters information
  const parameters = constructor.parameters.parameters;
  // Gets all arguments arrays and concat them into one array
  const usedOnModifiers = modifiers.flatMap((m: ModifierInvocation) => [
    ...findAll('Identifier', m),
  ]);

  if (!parameters?.length) {
    return '';
  } else {
    let result: string = getArgsList(constructor, helper);
    const usedIds = new Set(
      [...findAll('Identifier', constructor.body!)].map(i => i.referencedDeclaration),
    );

    for (const p of parameters) {
      // Check if parameter is used on the body or the modifiers
      if (
        !usedIds.has(p.id) &&
        !usedOnModifiers.some((m: Identifier) => m!.referencedDeclaration! === p.id)
      ) {
        // Remove unused parameter
        result = result.replace(/\s+[a-z0-9$_]+/gi, m => (m.trim() === p.name ? '' : m));
      }
    }
    return result;
  }
}

// Runs after transformConstructor to remove the constructor keyword and parameters until the first `{`. For example
// This: constructor(uint a) /* modifiers */ public { function __Name_init(uint a) /* modifiers */
// Results in: function __Name_init(uint a) /* modifiers */
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

// Inserts the init and unchained function declarations before the constructor first`{`,
// and must run removeLeftoverConstructorHead after. For example
// This: constructor(uint a) /* modifiers */ public
// Results in: constructor(uint a) /* modifiers */ public { function __Name_init(uint a) /* modifiers */
export function transformConstructor(isNamespaced?: (source: string) => boolean) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    const { resolver, getData } = tools;

    const useNamespaces = isNamespaced?.(sourceUnit.absolutePath) ?? false;

    for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
      if (contractNode.contractKind !== 'contract' || hasConstructorOverride(contractNode)) {
        continue;
      }

      const { name } = contractNode;
      const {
        constructorNode,
        varInitNodes,
        modifiers,
        emptyUnchained: emptyConstructor,
      } = getInitializerItems(contractNode, resolver);

      const namespace = getNamespaceStructName(name);
      const constructorUsesStorage =
        constructorNode !== undefined && usesStorageVariables(constructorNode, resolver);

      const initializer = (
        helper: TransformHelper,
        argsList = '',
        unchainedArgsList = '',
        argNames: string[] = [],
      ) => [
        `function __${name}_init(${argsList}) internal onlyInitializing {`,
        buildSuperCallsForChain(contractNode, tools, helper),
        emptyConstructor ? [] : [`__${name}_init_unchained(${argNames.join(', ')});`],
        `}`,
        ``,
        [
          `function`,
          `__${name}_init_unchained(${unchainedArgsList})`,
          `internal onlyInitializing`,
          ...modifiers.map(m => helper.read(m)),
          `{`,
        ].join(' '),
        useNamespaces && varInitNodes.length > 0 && !constructorUsesStorage
          ? [`${namespace} storage $ = _get${namespace}();`]
          : [],
        varInitNodes.flatMap(v => {
          const prefix = useNamespaces ? '$.' : '';
          const newExpr = parseNewExpression(v.value!);
          if (!newExpr) {
            return [`${prefix}${v.name} = ${helper.read(v.value!)};`];
          } else {
            const { typeName, newCall, initializeCall } = newExpr;
            const createdContract = resolver.resolveContract(typeName.referencedDeclaration);
            if (createdContract) {
              getData(createdContract).isUsedInNewStatement = true;
            }
            return [
              `${prefix}${v.name} = ${newCall(helper)};`,
              `${initializeCall(v.name, helper)};`,
            ];
          }
        }),
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
            const unchainedArgsList = getUnchainedArguments(constructorNode, helper, modifiers);

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
  };
}

function usesStorageVariables(fnDef: FunctionDefinition, resolver: ASTResolver): boolean {
  if (fnDef.body) {
    for (const ref of findAll('Identifier', fnDef.body)) {
      const varDecl = resolver.tryResolveNode('VariableDeclaration', ref.referencedDeclaration!);
      if (varDecl && isStorageVariable(varDecl, resolver)) {
        return true;
      }
    }
  }
  return false;
}
