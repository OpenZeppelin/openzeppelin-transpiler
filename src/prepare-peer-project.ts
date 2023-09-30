import path from 'path';

import { Transform } from './transform';
import { extractContractStorageSize, extractContractStateless } from './utils/natspec';
import { isStorageVariable } from './transformations/utils/is-storage-variable';

export function preparePeerProject(transform: Transform, peerProject: string) {
  for (const ast of transform.asts()) {
    for (const node of ast.nodes) {
      switch (node.nodeType) {
        case 'ContractDefinition': {
          if (node.contractKind === 'contract') {
            if (!extractContractStateless(node)) {
              continue;
            }
            if (extractContractStorageSize(node) !== undefined) {
              throw transform.error(
                node,
                'Contract marked as stateless should not have an associated storage size',
              );
            }
            for (const decl of node.nodes) {
              if (
                decl.nodeType == 'VariableDeclaration' &&
                isStorageVariable(decl, transform.resolver)
              ) {
                throw transform.error(
                  node,
                  'Contract marked as stateless should not contain storage variable declarations',
                );
              }
              if (decl.nodeType == 'FunctionDefinition' && decl.kind == 'constructor') {
                throw transform.error(
                  node,
                  'Contract marked as stateless should not have a constructor',
                );
              }
            }
          }
          transform.getData(node).importFromPeer = path.join(peerProject, ast.absolutePath);
          break;
        }
        case 'EnumDefinition':
        case 'ErrorDefinition':
        case 'FunctionDefinition':
        case 'StructDefinition':
        case 'UserDefinedValueTypeDefinition':
        case 'VariableDeclaration': {
          transform.getData(node).importFromPeer = path.join(peerProject, ast.absolutePath);
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
}
