import { getVarInits } from './get-var-inits';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function purgeVarInits(contractNode: ContractDefinition, source: string): Transformation[] {
  return getVarInits(contractNode, source).map(([, start, match]) => ({
    kind: 'purge-var-inits',
    start: start + match[1].length,
    end: start + match[1].length + match[2].length,
    text: '',
  }));
}
