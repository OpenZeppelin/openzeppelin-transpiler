import { flatten, keyBy } from 'lodash';

import { getNodeSources, getConstructor, getContract, isModifierInvocation, getVarDeclarations } from '../solc/ast-utils';

import { getInheritanceChain } from '../solc/get-inheritance-chain';
import { ContractDefinition, ModifierInvocation, InheritanceSpecifier, Node, FunctionDefinition } from '../solc/ast-node';
import { Artifact } from '../solc/artifact';

// builds an __init call with given arguments, for example
// ERC20DetailedUpgradeable.__init(false, "Gold", "GLD", 18)
function buildSuperCall(args: Node[], name: string, source: string): string {
  let superCall = `\n        __${name}_init_unchained(`;
  if (args && args.length) {
    superCall += args.map(arg => getNodeSources(arg, source)[2]).join(', ');
  }
  return superCall + ');';
}

// builds all the __init calls a given contract, for example
// ContextUpgradeable.__init(false);
// ERC20DetailedUpgradeable.__init(false, 'Gold', 'GLD', 18);
export function buildSuperCallsForChain(
  contractNode: ContractDefinition,
  contractsToTranspile: Artifact[],
  contractsToArtifactsMap: Record<string, Artifact>,
): string {
  // first we get the linearized inheritance chain of contracts, excluding the
  // contract we're currently looking at
  const chain = getInheritanceChain(contractNode.name, contractsToArtifactsMap).map(getContract).reverse();

  // we will need their ast ids for quick lookup
  const chainIds = new Set(chain.map(c => c.id));

  // now we gather all constructor calls taken from the two possible sources
  // 1) "modifiers" on parent constructors, and
  // 2) arguments in the inheritance list (contract X is Y, Z(arg1, arg2) ...)
  // since the contract was compiled successfully, we are guaranteed that each base contract
  // will show up in at most one of these two places across all contracts in the chain (can also be zero)
  const ctorCalls = keyBy(flatten(
    chain.map(parentNode => {
      const res = [];
      const constructorNode = getConstructor(parentNode);
      const { source } = contractsToArtifactsMap[parentNode.name];
      if (constructorNode) {
        for (const call of constructorNode.modifiers) {
          // we only care about modifiers that reference base contracts
          const { referencedDeclaration } = call.modifierName;
          if (referencedDeclaration != null && chainIds.has(referencedDeclaration)) {
            res.push({ call, source });
          }
        }
      }
      for (const call of parentNode.baseContracts) {
        if (call.arguments != null) {
          res.push({ call, source })
        }
      }
      return res;
    }),
  ), mod => {
    if (mod.call.nodeType === 'ModifierInvocation') {
      if (mod.call.modifierName.referencedDeclaration == null) {
        throw new Error('Missing referencedDeclaration field');
      }
      return mod.call.modifierName.referencedDeclaration;
    } else {
      return mod.call.baseName.referencedDeclaration;
    }
  });

  // once we have gathered all constructor calls for each parent, we linearize
  // them according to chain. we also fill in the implicit constructor calls
  const linearizedCtorCalls: string[] = [];

  for (const parentNode of chain) {
    if (parentNode === contractNode) continue;

    let args = ctorCalls[parentNode.id]?.call?.arguments;

    if (args == undefined && isImplicitlyConstructed(parentNode)) {
      args = [];
    }

    if (args) {
      // TODO: we have to use the name in the lexical context and not necessarily
      // the original contract name
      linearizedCtorCalls.push(buildSuperCall(args, parentNode.name, ctorCalls[parentNode.id]?.source));
    }
  }

  return linearizedCtorCalls.join('');
}

function isImplicitlyConstructed(contract: ContractDefinition): boolean {
  const ctor = getConstructor(contract);

  return (contract.contractKind === 'contract') && (ctor == undefined || ctor.parameters.parameters.length === 0);
}
