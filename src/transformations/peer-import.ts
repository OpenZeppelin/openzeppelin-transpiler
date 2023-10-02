import { SourceUnit } from 'solidity-ast';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import assert from 'assert';

export function* peerImport(
  ast: SourceUnit,
  { getData }: TransformerTools,
): Generator<Transformation> {
  for (const node of ast.nodes) {
    const { importFromPeer } = getData(node);
    if (importFromPeer !== undefined) {
      assert('name' in node);
      yield {
        ...getNodeBounds(node),
        kind: 'replace-declaration-with-peer-import',
        text: `import { ${node.name} } from "${importFromPeer}";`,
      };
    }
  }
}
