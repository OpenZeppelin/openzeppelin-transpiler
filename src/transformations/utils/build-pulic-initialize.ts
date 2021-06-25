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
    args = tools.readOriginal(ctor.parameters);
    argNames = ctor.parameters.parameters.map(p => p.name).join(', ');
  }

  return formatLines(1, [
    `function initialize${args} public virtual initializer {`,
    [`__${contract.name}_init(${argNames});`],
    '}',
  ]);
}
