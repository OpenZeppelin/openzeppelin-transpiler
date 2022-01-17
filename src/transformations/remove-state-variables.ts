import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';
import { TransformerTools } from '../transform';
import {prevNodeBounds} from "./utils/prev-contract-node";
import {newFunctionPosition} from "./utils/new-function-position";

export function* removeStateVariables(sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
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
        const vCodeStart = tools.originalSource.substring(vBounds.start);
        const vCode = vCodeStart.match(/.*?;\n?/s);
        const vLength = vCode === null ? vBounds.length + 1 : vCode[0].length;

        yield {
          start: vBounds.start,
          length: vLength,
          kind: 'remove-var-states',
          transform: source => source.replace(/.*/s, ''),
        };
      }
    }
  }
}
