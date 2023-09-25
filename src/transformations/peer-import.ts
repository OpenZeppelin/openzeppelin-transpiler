import { SourceUnit } from 'solidity-ast';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { getNodeBounds } from '../solc/ast-utils';

export function* peerImport(
  ast: SourceUnit,
  { getData }: TransformerTools,
): Generator<Transformation> {
  for (const node of ast.nodes) {
    switch (node.nodeType) {
      case 'ContractDefinition':
      case 'EnumDefinition':
      case 'ErrorDefinition':
      case 'FunctionDefinition':
      case 'StructDefinition':
      case 'UserDefinedValueTypeDefinition':
      case 'VariableDeclaration': {
        const { importFromPeer } = getData(node);
        if (importFromPeer !== undefined) {
          yield {
            ...getNodeBounds(node),
            kind: 'replace-declaration-with-peer-import',
            text: `import { ${node.name} } from "${importFromPeer}";`,
          };
        }
        break;
      }
      case 'ImportDirective':
      case 'PragmaDirective':
      case 'UsingForDirective': {
        break;
      }
    }
  }
}
