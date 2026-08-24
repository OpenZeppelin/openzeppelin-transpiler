import { Node } from 'solidity-ast/node';

import { TransformerTools } from '../../transform';

export function getRealEndIndex(node: Node, tools: TransformerTools): number {
  // VariableDeclaration node bounds don't include the semicolon, so we look for it,
  // and include a comment if there is one after the node.
  // This regex always matches at least the empty string.
  const { start, length } = tools.matchOriginalAfter(node, /(\s*;)?([ \t]*\/\/[^\n\r]*)?/)!;
  return start + length - 1;
}
