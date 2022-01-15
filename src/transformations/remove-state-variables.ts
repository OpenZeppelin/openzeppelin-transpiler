import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* removeStateVariables(sourceUnit: SourceUnit): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (hasConstructorOverride(contractNode)) {
      continue;
    }

    for (const varDecl of findAll('VariableDeclaration', contractNode)) {
      if (varDecl.stateVariable && !varDecl.constant) {
        if (hasOverride(varDecl, 'state-variable-assignment')) {
          continue;
        }

        const {start, length} = getNodeBounds(varDecl);

        const vBounds  = getNodeBounds(varDecl);
        const cBounds = getNodeBounds(contractNode);
        yield {
          start: cBounds.start,
          length: vBounds.start - cBounds.start,
          kind: 'trim-var-states-contract',
          transform: source => source.trimEnd(),
        };

        yield {
          start: vBounds.start,
          length: vBounds.length + 1,
          kind: 'remove-var-states',
          transform: source => source.replace(/.*/s, ''),
        };
      }
    }
  }
}
