import { ContractDefinition } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { ASTResolver } from '../../ast-resolver';
import { getConstructor } from '../../solc/ast-utils';
import { hasOverride } from '../../utils/upgrades-overrides';
import { isStorageVariable } from './is-storage-variable';

export function getInitializerItems(contract: ContractDefinition, resolver: ASTResolver) {
  const constructorNode = getConstructor(contract);

  const varInitNodes = [...findAll('VariableDeclaration', contract)].filter(
    v =>
      v.value &&
      isStorageVariable(v, resolver) &&
      !hasOverride(v, 'state-variable-assignment', resolver),
  );

  const modifiers =
    constructorNode?.modifiers.filter(
      call => !contract.linearizedBaseContracts?.includes(call.modifierName.referencedDeclaration!),
    ) ?? [];

  const emptyUnchained =
    !constructorNode?.body?.statements?.length && varInitNodes.length == 0 && modifiers.length == 0;

  return {
    constructorNode,
    varInitNodes,
    modifiers,
    emptyUnchained,
  };
}
