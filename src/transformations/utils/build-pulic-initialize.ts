import { ContractDefinition } from 'solidity-ast';
import { TransformerTools } from '../../transform';
import { formatLines } from './format-lines';
import { getConstructor } from '../../solc/ast-utils';

export function buildPublicInitialize(
  contract: ContractDefinition,
  tools: TransformerTools,
): string {
  const ctor = getConstructor(contract);

  let args = '';
  let argNames = '';
  if (ctor) {
    const ctorSource = tools.readOriginal(ctor);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const argsMatch = ctorSource.match(/\((.*?)\)/s);
    if (argsMatch === null) {
      throw new Error(`Could not find constructor arguments for ${contract.name}`);
    }
    args = argsMatch[1];
    argNames = ctor.parameters.parameters.map(p => p.name).join(', ');
  }

  return formatLines(1, [
    `function initialize(${args}) external initializer {`,
    [`__${contract.name}_init(${argNames});`],
    '}',
  ]);
}
