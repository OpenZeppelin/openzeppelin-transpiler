import { flatten, keyBy } from 'lodash';

import { getConstructor } from '../../solc/ast-utils';

import { ContractDefinition } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { TransformHelper } from '../type';
import { TransformerTools } from '../../transform';
import { hasConstructorOverride } from '../../utils/upgrades-overrides';

// builds an __init call with given arguments, for example
// ERC20DetailedUpgradeable.__init(false, "Gold", "GLD", 18)
function buildSuperCall2(args: Node[], name: string, helper: TransformHelper): string {
  let superCall = `__${name}_init_unchained(`;
  if (args && args.length) {
    superCall += args.map(arg => helper.read(arg)).join(', ');
  }
  return superCall + ');';
}

// builds all the __init calls a given contract, for example
// ContextUpgradeable.__init(false);
// ERC20DetailedUpgradeable.__init(false, 'Gold', 'GLD', 18);
export function buildSuperCallsForChain2(
  contractNode: ContractDefinition,
  { resolver }: TransformerTools,
  helper: TransformHelper,
): string[] {
  // first we get the linearized inheritance chain of contracts, excluding the
  // contract we're currently looking at
  const chain = contractNode.linearizedBaseContracts
    .map(baseId => {
      const base = resolver.resolveContract(baseId);
      if (!base) {
        throw new Error(`Could not resolve ast id ${baseId}`);
      }
      return base;
    })
    .reverse();

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

  // once we have gathered all constructor calls for each parent, we linearize
  // them according to chain. we also fill in the implicit constructor calls
  const linearizedCtorCalls: string[] = [];

  for (const parentNode of chain) {
    if (parentNode === contractNode || hasConstructorOverride(parentNode)) {
      continue;
    }

    let args = ctorCalls[parentNode.id]?.call?.arguments;

    if (args == undefined && isImplicitlyConstructed(parentNode)) {
      args = [];
    }

    if (args) {
      // TODO: we have to use the name in the lexical context and not necessarily
      // the original contract name
      linearizedCtorCalls.push(buildSuperCall2(args, parentNode.name, helper));
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
