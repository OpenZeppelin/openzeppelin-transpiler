import { SourceUnit } from 'solidity-ast';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';

import { Transformation } from './type';

export function* removePartial(
  sourceUnit: SourceUnit,
  { getData }: TransformerTools,
): Generator<Transformation> {
  for (const node of sourceUnit.nodes) {
    switch (node.nodeType) {
      case 'ContractDefinition':
      case 'EnumDefinition':
      case 'ErrorDefinition':
      case 'FunctionDefinition':
      case 'StructDefinition':
      case 'UserDefinedValueTypeDefinition': {
        const { importFromPeer } = getData(node);
        if (importFromPeer !== undefined) {
          yield {
            ...getNodeBounds(node),
            kind: 'remove-libraries-and-interfaces',
            text: `import { ${node.name} } from "${importFromPeer}";`,
          };
        }
        break;
      }
      case 'ImportDirective':
      case 'PragmaDirective':
      case 'UsingForDirective':
      case 'VariableDeclaration': {
        break;
      }
    }
  }
}
