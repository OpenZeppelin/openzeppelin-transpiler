import { flatten, keyBy } from 'lodash';

import { getConstructor } from '../../solc/ast-utils';
import { ContractDefinition, Expression, VariableDeclaration } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { TransformHelper } from '../type';
import { TransformerTools } from '../../transform';
import { hasConstructorOverride } from '../../utils/upgrades-overrides';
import { getInitializerItems } from './get-initializer-items';
import { findAll } from 'solidity-ast/utils';

// builds an __init call with given arguments, for example
// ERC20DetailedUpgradeable.__init(false, "Gold", "GLD", 18)
function buildSuperCall(args: Node[], name: string, helper: TransformHelper): string {
  let superCall = `__${name}_init_unchained(`;
  if (args && args.length) {
    superCall += args.map(arg => helper.read(arg)).join(', ');
  }
  return superCall + ');';
}

// builds all the __init calls a given contract, for example
// ContextUpgradeable.__init(false);
// ERC20DetailedUpgradeable.__init(false, 'Gold', 'GLD', 18);
export function buildSuperCallsForChain(
  contractNode: ContractDefinition,
  { resolver }: TransformerTools,
  helper: TransformHelper,
): string[] {
  // first we get the linearized inheritance chain of contracts, excluding the
  // contract we're currently looking at
  const chain = contractNode.linearizedBaseContracts.map(baseId => {
    const base = resolver.resolveContract(baseId);
    if (base === undefined) {
      throw new Error(`Could not resolve ast id ${baseId}`);
    }
    return base;
  });

  // we will need their ast ids for quick lookup
  const chainIds = new Set(chain.map(c => c.id));

  // now we gather all constructor calls taken from the two possible sources
  // 1) "modifiers" on parent constructors, and
  // 2) arguments in the inheritance list (contract X is Y, Z(arg1, arg2) ...)
  // since the contract was compiled successfully, we are guaranteed that each base contract
  // will show up in at most one of these two places across all contracts in the chain (can also be zero)
  const ctorCalls = keyBy(
    flatten(
      chain.map(parentNode => {
        const res = [];
        const constructorNode = getConstructor(parentNode);
        if (constructorNode) {
          for (const call of constructorNode.modifiers) {
            // we only care about modifiers that reference base contracts
            const { referencedDeclaration } = call.modifierName;
            if (referencedDeclaration != null && chainIds.has(referencedDeclaration)) {
              res.push({ call });
            }
          }
        }
        for (const call of parentNode.baseContracts) {
          if (call.arguments != null) {
            res.push({ call });
          }
        }
        return res;
      }),
    ),
    mod => {
      if (mod.call.nodeType === 'ModifierInvocation') {
        if (mod.call.modifierName.referencedDeclaration == null) {
          throw new Error('Missing referencedDeclaration field');
        }
        return mod.call.modifierName.referencedDeclaration;
      } else {
        return mod.call.baseName.referencedDeclaration;
      }
    },
  );

  // this is where we store the parents of uninitialized parents if any
  const notInitializable = new Set<number>();

  const argsValues = new Map<VariableDeclaration, Expression>();
  const parentArgsValues = new Map<ContractDefinition, Expression[]>();

  for (const parentNode of chain) {
    if (parentNode === contractNode) {
      continue;
    }
    const ctorCallArgs = ctorCalls[parentNode.id]?.call?.arguments;

    if (!ctorCallArgs) {
      // We don't have arguments for this parent, but it may be implicitly constructed (has zero args)
      if (isImplicitlyConstructed(parentNode)) {
        parentArgsValues.set(parentNode, []);
      } else {
        // If a parent is not initializable, we assume its parents aren't initializable either,
        // because we may not have their constructor arguments.
        // The user will invoke them anyway in the chained initializer of this parent, which
        // will have to be manually called.
        for (const parent of parentNode.linearizedBaseContracts) {
          notInitializable.add(parent);
        }
      }
    } else {
      const parameters = getConstructor(parentNode)!.parameters.parameters;

      const parentArgs = ctorCallArgs.map((arg, index) => {
        const param = parameters[index];

        if (arg.nodeType === 'Identifier') {
          // We have something like `constructor(uint x) Parent(x)`.
          // We have to get the value associated to this "source param" `uint x`, if any.
          const sourceParam = resolver.resolveNode(
            'VariableDeclaration',
            arg.referencedDeclaration!,
          );
          const sourceValue = argsValues.get(sourceParam);
          if (sourceValue) {
            if (sourceValue.nodeType === 'Literal' || sourceValue.nodeType === 'Identifier') {
              // If the source value is a literal or another identifier, we use it as the argument.
              arg = argsValues.get(sourceParam)!;
            } else {
              throw new Error(
                `Can't transpile non-trivial expression in parent constructor argument (${helper.read(
                  arg,
                )})`,
              );
            }
          }
        } else {
          const identifiers = [...findAll('Identifier', arg)];
          for (const id of identifiers) {
            const sourceParam = resolver.resolveNode(
              'VariableDeclaration',
              id.referencedDeclaration!,
            );
            if (argsValues.has(sourceParam)) {
              index = 0;
              throw new Error(
                `Can't transpile non-trivial expression in parent constructor argument (${helper.read(
                  arg,
                )})`,
              );
            }
          }
        }
        argsValues.set(param, arg);
        return arg;
      });

      parentArgsValues.set(parentNode, parentArgs);
    }
  }

  // once we have gathered all constructor calls for each parent, we linearize
  // them according to chain.
  const linearizedCtorCalls: string[] = [];

  chain.reverse();

  for (const parentNode of chain) {
    if (
      parentNode === contractNode ||
      hasConstructorOverride(parentNode) ||
      parentNode.contractKind === 'interface' ||
      notInitializable.has(parentNode.id)
    ) {
      continue;
    }

    const args = parentArgsValues.get(parentNode) ?? [];

    if (args.length || !getInitializerItems(parentNode).emptyUnchained) {
      // TODO: we have to use the name in the lexical context and not necessarily
      // the original contract name
      linearizedCtorCalls.push(buildSuperCall(args, parentNode.name, helper));
    }
  }

  return linearizedCtorCalls;
}

function isImplicitlyConstructed(contract: ContractDefinition): boolean {
  const ctor = getConstructor(contract);

  return (
    contract.contractKind === 'contract' &&
    (ctor == undefined || ctor.parameters.parameters.length === 0)
  );
}
