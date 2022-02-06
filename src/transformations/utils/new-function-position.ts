import { ContractDefinition } from 'solidity-ast';

import { TransformerTools } from '../../transform';
import { getNodeBounds } from '../../solc/ast-utils';
import { matchFrom } from '../../utils/match-from';

export function newFunctionPosition(
  contract: ContractDefinition,
  { readOriginal }: TransformerTools,
  atEnd = false,
): number {
  if (atEnd) {
    const contractText = readOriginal(contract);
    const offset = contractText.lastIndexOf('}');
    if (offset < 1) {
      throw new Error(`Can't find ending of contract ${contract.name}`);
    }

    return getNodeBounds(contract).start + offset - 1;

  } else {
    const offset = getNodeBounds(contract).start;
    let searchStart = 0;

    if (contract.baseContracts.length > 0) {
      const [lastParent] = contract.baseContracts.slice(-1);
      const pb = getNodeBounds(lastParent);
      searchStart = pb.start + pb.length - offset;
    }

    const brace = matchFrom(readOriginal(contract), /\{[\t ]*\n?/, searchStart);
    if (brace === null) {
      throw new Error(`Can't find start of contract ${contract.name}`);
    }

    return offset + brace.index +  brace[0].length;
  }}


