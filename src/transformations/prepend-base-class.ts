import { getSourceIndices, getNodeSources } from '../solc/ast-utils';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function* prependBaseClass(
  contractNode: ContractDefinition,
  source: string,
  cls: string,
): Generator<Transformation> {
  if (contractNode.contractKind !== 'contract') {
    return;
  }

  if (contractNode.baseContracts.length > 0) {
    const [start] = getSourceIndices(contractNode.baseContracts[0]);
    yield {
      kind: 'prepend-base-class',
      start,
      length: 0,
      text: `${cls}, `,
    };
  } else {
    const re = new RegExp(`^(abstract\\s+)?contract\\s+${contractNode.name}\\b`);
    const [contractStart, , contractSource] = getNodeSources(contractNode, source);
    const match = re.exec(contractSource);

    if (!match) {
      throw new Error(`Can't find ${contractNode.name} in ${contractSource}`);
    }

    yield {
      kind: 'prepend-base-class',
      start: contractStart + match.index + match[0].length,
      length: 0,
      text: ` is ${cls}`,
    };
  }
}
