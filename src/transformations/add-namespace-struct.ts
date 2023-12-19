import { SourceUnit, VariableDeclaration } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';
import { Transformation } from './type';
import { formatLines } from './utils/format-lines';
import { isStorageVariable } from './utils/is-storage-variable';
import { erc7201Location } from '../utils/erc7201';
import { contractStartPosition } from './utils/contract-start-position';
import { Node } from 'solidity-ast/node';
import { extractContractStorageSize } from '../utils/natspec';

export function getNamespaceStructName(contractName: string): string {
  return contractName + 'Storage';
}

export function addNamespaceStruct(include?: (source: string) => boolean) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    if (!include?.(sourceUnit.absolutePath)) {
      return;
    }

    const { error, resolver } = tools;

    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      const specifiesStorageSize = extractContractStorageSize(contract) !== undefined;

      if (specifiesStorageSize) {
        throw tools.error(
          contract,
          'Cannot combine namespaces with @custom:storage-size annotations',
        );
      }

      let start = contractStartPosition(contract, tools);

      let finished = false;

      const nonStorageVars: [number, VariableDeclaration][] = [];
      const storageVars: VariableDeclaration[] = [];

      // We look for the start of the source code block in the contract
      // where variables are written
      for (const n of contract.nodes) {
        if (
          n.nodeType === 'VariableDeclaration' &&
          (storageVars.length > 0 || isStorageVariable(n, resolver))
        ) {
          if (finished) {
            throw error(n, 'All variables in the contract must be contiguous');
          }

          if (!isStorageVariable(n, resolver)) {
            const varStart = getRealEndIndex(storageVars.at(-1)!, tools) + 1;
            nonStorageVars.push([varStart, n]);
          } else {
            storageVars.push(n);
          }
        } else if (storageVars.length > 0) {
          // We've seen storage variables before and the current node is not a
          // variable, so we consider the block to have finished
          finished = true;
        } else {
          // We haven't found storage variables yet. We assume the block of
          // variables will start after the current node
          start = getRealEndIndex(n, tools) + 1;
        }
      }

      if (storageVars.length > 0) {
        // We first move non-storage variables from their location to the beginning of
        // the block, so they are excluded from the namespace struct
        for (const [s, v] of nonStorageVars) {
          const bounds = { start: s, length: getRealEndIndex(v, tools) + 1 - s };
          let removed = '';

          yield {
            kind: 'relocate-nonstorage-var-remove',
            ...bounds,
            transform: source => {
              removed = source;
              return '';
            },
          };

          yield {
            kind: 'relocate-nonstorage-var-reinsert',
            start,
            length: 0,
            text: removed,
          };
        }

        if (nonStorageVars.length > 0) {
          yield {
            kind: 'relocate-nonstorage-var-newline',
            start,
            length: 0,
            text: '\n',
          };
        }

        for (const v of storageVars) {
          const { start, length } = getNodeBounds(v);
          yield {
            kind: 'remove-var-modifier',
            start,
            length,
            transform: source => source.replace(/\s*\bprivate\b/g, ''),
          };
        }

        const namespace = getNamespaceStructName(contract.name);
        const id = 'openzeppelin.storage.' + contract.name;

        const end = getRealEndIndex(storageVars.at(-1)!, tools) + 1;

        yield {
          kind: 'add-namespace-struct',
          start,
          length: end - start,
          transform: source => {
            // We extract the newlines at the beginning of the block so we can leave
            // them outside of the struct definition
            const [, leadingNewlines, rest] = source.match(/^((?:[ \t\v\f]*[\n\r])*)(.*)$/s)!;
            return (
              leadingNewlines +
              formatLines(1, [
                `/// @custom:storage-location erc7201:${id}`,
                `struct ${namespace} {`,
                ...rest.split('\n'),
                `}`,
                ``,
                `// keccak256(abi.encode(uint256(keccak256("${id}")) - 1)) & ~bytes32(uint256(0xff))`,
                `bytes32 internal constant ${namespace}Location = ${erc7201Location(id)};`,
                ``,
                `function _get${namespace}() private pure returns (${namespace} storage $) {`,
                [`assembly {`, [`$.slot := ${namespace}Location`], `}`],
                `}`,
              ]).trimEnd()
            );
          },
        };

        for (const fnDef of findAll('FunctionDefinition', contract)) {
          for (const ref of fnDef.modifiers.flatMap(m => [...findAll('Identifier', m)])) {
            const varDecl = resolver.tryResolveNode(
              'VariableDeclaration',
              ref.referencedDeclaration!,
            );
            if (varDecl && isStorageVariable(varDecl, resolver)) {
              throw error(ref, 'Unsupported storage variable found in modifier');
            }
          }

          let foundReferences = false;
          if (fnDef.body) {
            for (const ref of findAll('Identifier', fnDef.body)) {
              const varDecl = resolver.tryResolveNode(
                'VariableDeclaration',
                ref.referencedDeclaration!,
              );
              if (varDecl && isStorageVariable(varDecl, resolver)) {
                if (varDecl.scope !== contract.id) {
                  throw error(varDecl, 'Namespaces assume all variables are private');
                }
                foundReferences = true;
                const { start } = getNodeBounds(ref);
                yield { kind: 'add-namespace-ref', start, length: 0, text: '$.' };
              }
            }

            if (fnDef.kind !== 'constructor' && foundReferences) {
              // The constructor is handled in transformConstructor
              const { start: fnBodyStart } = getNodeBounds(fnDef.body);
              yield {
                kind: 'add-namespace-base-ref',
                start: fnBodyStart + 1,
                length: 0,
                text: `\n        ${namespace} storage $ = _get${namespace}();`,
              };
            }
          }
        }
      }
    }
  };
}

function getRealEndIndex(node: Node, tools: TransformerTools): number {
  // VariableDeclaration node bounds don't include the semicolon, so we look for it,
  // and include a comment if there is one after the node.
  // This regex always matches at least the empty string.
  const { start, length } = tools.matchOriginalAfter(node, /(\s*;)?([ \t]*\/\/[^\n\r]*)?/)!;
  return start + length - 1;
}
