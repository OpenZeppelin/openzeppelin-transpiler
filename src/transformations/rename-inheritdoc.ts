import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { renameContract } from '../rename';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* renameInheritdoc(
  sourceUnit: SourceUnit,
  { readOriginal }: TransformerTools,
): Generator<Transformation> {
  for (const doc of findAll('StructuredDocumentation', sourceUnit)) {
    const bounds = getNodeBounds(doc);
    const re = /(@inheritdoc\s+)([a-zA-Z0-9$_]+)/;
    const match = re.exec(readOriginal(doc));

    if (match) {
      yield {
        start: bounds.start + match.index + match[1].length,
        length: match[2].length,
        kind: 'rename-inheritdoc',
        transform: source => source.replace(/[a-zA-Z0-9$_]+$/, renameContract),
      };
    }
  }
}
