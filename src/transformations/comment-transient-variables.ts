import { SourceUnit, VariableDeclaration } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';

// Transient variables are passed through unchanged, which leaves them with solc's
// default layout instead of a namespace. The consequence is only visible to whoever
// composes the upgradeable contract, so it is documented in the transpiled source.
export function commentTransientVariables(include?: (source: string) => boolean) {
  return function* (sourceUnit: SourceUnit): Generator<Transformation> {
    // Namespaced mode only: the note contrasts with namespaced persistent storage.
    if (!include?.(sourceUnit.absolutePath)) {
      return;
    }

    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      // Own declarations only, and one note per contract rather than per declaration.
      const [first] = contract.nodes.filter(
        (n): n is VariableDeclaration =>
          n.nodeType === 'VariableDeclaration' && n.storageLocation === 'transient',
      );

      if (first === undefined) {
        continue;
      }

      // Anchored at the declaration rather than at the start of its line: the existing
      // indentation prefixes the note, the trailing one re-indents the declaration, and
      // the note falls inside the range addNamespaceStruct relocates, so the two move
      // together instead of the note being stranded inside the namespace struct.
      yield {
        kind: 'comment-transient-variables',
        start: getNodeBounds(first).start,
        length: 0,
        text: `/// @dev Transient variables are not namespaced, so composition at a shared address may collide.\n    `,
      };
    }
  };
}
