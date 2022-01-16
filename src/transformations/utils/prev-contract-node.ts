import {
  ContractDefinition,
  EnumDefinition,
  ErrorDefinition,
  EventDefinition,
  FunctionDefinition,
  ModifierDefinition,
  StructDefinition,
  UserDefinedValueTypeDefinition,
  UsingForDirective,
  VariableDeclaration,
} from 'solidity-ast';

import { Bounds } from '../type';
import { getNodeBounds } from '../../solc/ast-utils';

/**
 * Find the previous sub-node of a contract
 * @param contract the contract definition node
 * @param id id of the current node
 */
export function prevContractNode(
  contract: ContractDefinition,
  id: number,
): (EnumDefinition
  | ErrorDefinition
  | EventDefinition
  | FunctionDefinition
  | ModifierDefinition
  | StructDefinition
  | UserDefinedValueTypeDefinition
  | UsingForDirective
  | VariableDeclaration
  | undefined) {

  let prevNode = undefined;
  for (const node of contract.nodes) {
    if (node.id == id) {
      break;
    } else {
      prevNode = node;
    }
  }

  return prevNode;

}

export function prevNodeBounds(
  contract: ContractDefinition,
  id: number,): Bounds | undefined {

  const prevNode = prevContractNode(contract, id);
  if (prevNode !== undefined) {
    return getNodeBounds(prevNode);
  }

  return undefined;
}
