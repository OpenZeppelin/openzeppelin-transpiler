import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';
import { TransformerTools } from '../transform';
import {prevNodeBounds} from "./utils/prev-contract-node";

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

        const vBounds = getNodeBounds(varDecl);
        const pBounds = prevNodeBounds(contractNode, varDecl.id);

        if (pBounds !== undefined) {
          const pBoundsEnd = pBounds.start + pBounds.length + 1;
          // yield {
          //   start: pBoundsEnd,
          //   length: vBounds.start - pBoundsEnd,
          //   kind: 'remove-var-states-comments',
          //   transform: () => '',
          // };
        }

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
