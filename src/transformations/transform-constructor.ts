import { flatten } from 'lodash';
import { SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { TransformerTools } from '../transform';
import { ASTResolver } from '../ast-resolver';
import { matchFrom } from '../utils/match-from';

type Line = string | Line[];

function format(indent: number, lines: Line[]): string {
  function indentEach(indent: number, lines: Line[]): Line[] {
    return lines.map(line =>
      Array.isArray(line) ? indentEach(indent + 1, line) : line && '    '.repeat(indent) + line,
    );
  }

  return flatten(indentEach(indent, lines)).join('\n');
}

export function* removeLeftoverConstructorHead(
  sourceUnit: SourceUnit,
  { originalSource, isExcluded }: TransformerTools,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit, isExcluded)) {
    const constructorNode = getConstructor(contractNode);
    if (constructorNode) {
      const { start: ctorStart } = getNodeBounds(constructorNode);
      // TODO: support struct arguments in initializers
      const match = matchFrom(originalSource, /{/, ctorStart);
      if (!match) {
        throw new Error(`Could not find start of constructor for ${contractNode.name}`);
      }
      yield {
        start: ctorStart,
        length: match.index + 1 - ctorStart,
        kind: 'remove-leftover-constructor',
        text: '',
      };
    }
  }
}

export function* transformConstructor(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  const { originalSource, resolver, isExcluded } = tools;

  for (const contractNode of findAll('ContractDefinition', sourceUnit, isExcluded)) {
    if (contractNode.contractKind !== 'contract') {
      continue;
    }

    const { name } = contractNode;

    const constructorNode = getConstructor(contractNode);

    const varInitNodes = [...findAll('VariableDeclaration', contractNode)].filter(
      v => v.stateVariable && v.value && !v.constant,
    );

    const initializer = (helper: TransformHelper, argsList = '', argNames: string[] = []) => [
      `function __${name}_init(${argsList}) internal initializer {`,
      buildSuperCallsForChain2(contractNode, tools, helper),
      [`__${name}_init_unchained(${argNames.join(', ')});`],
      `}`,
      ``,
      `function __${name}_init_unchained(${argsList}) internal initializer {`,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      varInitNodes.map(v => `${v.name} = ${helper.read(v.value!)};`),
      `}`,
    ];

    if (constructorNode) {
      const { start: ctorStart } = getNodeBounds(constructorNode);
      // TODO: support struct arguments in initializers
      const match = matchFrom(originalSource, /{/, ctorStart);
      if (!match) {
        throw new Error(`Could not find start of constructor for ${contractNode.name}`);
      }

      const argNames = constructorNode.parameters.parameters.map(p => p.name);

      yield {
        start: match.index + match[0].length,
        length: 0,
        kind: 'transform-constructor',
        transform: (_, helper) => {
          const source = helper.read(constructorNode);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const argsMatch = source.match(/\((.*?)\)/s);
          if (argsMatch === null) {
            throw new Error(`Could not find constructor arguments for ${contractNode.name}`);
          }
          const [, argsList] = argsMatch;
          return format(1, initializer(helper, argsList, argNames).slice(0, -1)).replace(
            /^\s+/,
            '',
          );
        },
      };
    } else {
      let after;
      if (contractNode.baseContracts.length > 0) {
        const [lastParent] = contractNode.baseContracts.slice(-1);
        const pb = getNodeBounds(lastParent);
        after = pb.start + pb.length;
      } else {
        after = getNodeBounds(contractNode).start;
      }

      const brace = originalSource.indexOf('{', after);

      if (brace < 0) {
        throw new Error(`Can't find start of contract ${contractNode.name}`);
      }

      yield {
        start: brace + 1,
        length: 0,
        kind: 'transform-constructor',
        transform: (source, helper) => '\n' + format(1, initializer(helper)),
      };
    }
  }
}
