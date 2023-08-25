import { ContractDefinition } from 'solidity-ast';

import { TransformerTools } from '../../transform';
import { isNodeType } from 'solidity-ast/utils';
import { contractStartPosition } from './contract-start-position';

export function newFunctionPosition(contract: ContractDefinition, tools: TransformerTools): number {
  const firstFunctionIndex = contract.nodes.findIndex(isNodeType('FunctionDefinition'));

  if (firstFunctionIndex <= 0) {
    return contractStartPosition(contract, tools);
  } else {
    const prevNode = contract.nodes[firstFunctionIndex - 1];
    // VariableDeclaration node bounds don't include the semicolon, so we look for it
    // in case prevNode is that type of node
    const m = tools.matchOriginalAfter(prevNode, /(\s*;)?([ \t\v\f]*[\n\r])*/)!;
    return m.start + m.length;
  }
}
