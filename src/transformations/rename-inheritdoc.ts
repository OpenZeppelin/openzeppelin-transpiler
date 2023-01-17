import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { renameContract } from '../rename';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { matchBuffer } from '../utils/match';

export function* renameInheritdoc(
  sourceUnit: SourceUnit,
  { readOriginal }: TransformerTools,
): Generator<Transformation> {
  for (const doc of findAll('StructuredDocumentation', sourceUnit)) {
    const bounds = getNodeBounds(doc);
    const re = /(@inheritdoc\s+)([a-zA-Z0-9$_]+)/;
    const match = matchBuffer(readOriginal(doc, 'buffer'), re);

    if (match) {
      yield {
        start: bounds.start + match.start + match.captureLengths[0],
        length: match.captureLengths[1],
        kind: 'rename-inheritdoc',
        transform: source => source.replace(/[a-zA-Z0-9$_]+$/, (oldName) => { return renameContract(oldName)} ),
      };
    }
  }
}
