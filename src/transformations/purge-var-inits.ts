import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';

import { getVarInits } from './utils/get-var-inits';
import { ContractDefinition } from '../solc/ast-node';
import { Transformation } from './type';

export function* purgeVarInits2(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const varDecl of findAll('VariableDeclaration', sourceUnit)) {
    if (varDecl.stateVariable && varDecl.value && !varDecl.constant) {
      yield {
        ...getNodeBounds(varDecl),
        kind: 'purge-var-inits',
        transform: source => source.replace(/\s+=.*/, ''),
      };
    }
  }
}

export function purgeVarInits(contractNode: ContractDefinition, source: string): Transformation[] {
  return getVarInits(contractNode, source).map(([, start, match]) => ({
    kind: 'purge-var-inits',
    start: start + match[1].length,
    length: match[2].length,
    text: '',
  }));
}
