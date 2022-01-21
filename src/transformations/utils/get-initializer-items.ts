import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getConstructor } from '../../solc/ast-utils';
import { hasOverride } from '../../utils/upgrades-overrides';

export function getInitializerItems(contract: ContractDefinition) {
  const constructorNode = getConstructor(contract);

  const varInitNodes = [...findAll('VariableDeclaration', contract)].filter(
    v => v.stateVariable && v.value && !v.constant && !hasOverride(v, 'state-variable-assignment'),
  );

  const modifiers = constructorNode?.modifiers.filter(
    call => !contract.linearizedBaseContracts?.includes(call.modifierName.referencedDeclaration!),
  ) ?? [];

  const empty = !constructorNode?.body?.statements?.length && varInitNodes.length == 0 && modifiers.length == 0;

  return {
    constructorNode,
    varInitNodes,
    modifiers,
    empty,
  };
}
