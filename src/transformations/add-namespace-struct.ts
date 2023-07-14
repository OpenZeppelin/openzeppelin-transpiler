import { SourceUnit, VariableDeclaration } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';
import { Transformation } from './type';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { isStorageVariable } from './utils/is-storage-variable';
import { erc7201Location } from '../utils/erc7201';

export function* addNamespaceStruct(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  const { error, resolver, getRealEndIndex } = tools;

  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    let start = newFunctionPosition(contract, tools, false);

    let firstVariable: VariableDeclaration | undefined;
    let lastVariable: VariableDeclaration | undefined;
    let finished = false;

    const nonStorage: [number, VariableDeclaration][] = [];

    for (const n of contract.nodes) {
      if (n.nodeType === 'VariableDeclaration') {
        if (finished) {
          throw error(n, 'All variables in the contract must be contiguous');
        }

        if (!isStorageVariable(n, resolver)) {
          const varStart = lastVariable ? getRealEndIndex(lastVariable) + 1 : start;
          nonStorage.push([varStart, n]);
        }

        firstVariable ??= n;
        lastVariable = n;
      } else if (firstVariable) {
        finished = true;
      } else {
        start = getRealEndIndex(n) + 1;
      }
    }

    for (const [s, v] of nonStorage) {
      const bounds = { start: s, length: getRealEndIndex(v) + 1 - s };
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

    if (nonStorage.length > 0) {
      yield {
        kind: 'relocate-nonstorage-var-newline',
        start,
        length: 0,
        text: '\n',
      };
    }

    if (firstVariable && lastVariable) {
      const namespace = contract.name + 'Storage';
      const id = 'openzeppelin.storage.' + contract.name;

      const end = getRealEndIndex(lastVariable) + 1;

      yield {
        kind: 'add-namespace-struct',
        start,
        length: end - start,
        transform: source => {
          const [, leading, rest] = source.match(/^((?:[ \t\v\f]*[\n\r]+)*)(.*)$/s)!;
          return (
            leading +
            formatLines(1, [
              `/// @custom:storage-location erc7201:${id}`,
              `struct ${namespace} {`,
              ...rest.split('\n'),
              `}`,
              ``,
              `// keccak256(abi.encode(uint256(keccak256("${id}")) - 1))`,
              `bytes32 private constant ${namespace}Location = ${erc7201Location(id)};`,
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

          if (foundReferences) {
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
}
