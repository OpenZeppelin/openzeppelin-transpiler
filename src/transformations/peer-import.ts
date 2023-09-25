import { SourceUnit } from 'solidity-ast';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* peerImport(
  ast: SourceUnit,
  { getData }: TransformerTools,
): Generator<Transformation> {
  for (const node of ast.nodes) {
    const { importFromPeer } = getData(node);
    if (importFromPeer !== undefined) {
      yield {
        ...getNodeBounds(node),
        kind: 'replace-declaration-with-peer-import',
        text: `import { ${node.name} } from "${importFromPeer}";`,
      };
    }
  }
}
