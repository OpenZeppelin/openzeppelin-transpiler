import { SourceUnit } from 'solidity-ast';
import { getNodeBounds } from '../solc/ast-utils';
import { renameContract } from '../rename';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import assert from 'assert';

declare module '../transform' {
  interface TransformData {
    importFromPeer: string;
  }
}

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
        kind: 'peer-import',
        text: `import {${node.name} as ${renameContract(node.name)}} from "${importFromPeer}";`,
      };
    }
  }
}
