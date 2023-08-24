import { ContractDefinition } from 'solidity-ast';

import { TransformerTools } from '../../transform';
import { getNodeBounds } from '../../solc/ast-utils';
import { matchBufferFrom } from '../../utils/match';

export function newFunctionPosition(
  contract: ContractDefinition,
  { readOriginal }: TransformerTools,
): number {
  const offset = getNodeBounds(contract).start;
  let searchStart = 0;

  if (contract.baseContracts.length > 0) {
    const [lastParent] = contract.baseContracts.slice(-1);
    const pb = getNodeBounds(lastParent);
    searchStart = pb.start + pb.length - offset;
  }

  const brace = matchBufferFrom(readOriginal(contract, 'buffer'), /\{\n?/, searchStart);

  if (!brace) {
    throw new Error(`Can't find start of contract ${contract.name}`);
  }

  return offset + brace.start + brace.length;
}
