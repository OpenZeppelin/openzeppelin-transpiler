import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';

import { Transformation } from './type';

export function* removePartial(
  sourceUnit: SourceUnit,
  { getData }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    const { importFromPeer } = getData(contract);
    if (importFromPeer !== undefined) {
      yield {
        ...getNodeBounds(contract),
        kind: 'remove-libraries-and-interfaces',
        transform: () => `import { ${contract.name} } from "${importFromPeer}";`,
      };
    }
  }
}
