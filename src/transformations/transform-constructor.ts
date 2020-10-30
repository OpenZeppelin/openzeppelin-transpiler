import { flatten } from 'lodash';
import { SourceUnit, Expression } from 'solidity-ast';

import {
  getNodeSources,
  getSourceIndices,
  getConstructor,
  stripBraces,
  getNodeBounds,
} from '../solc/ast-utils';
import { getVarInits } from './utils/get-var-inits';
import { Transformation, TransformHelper, Bounds } from './type';
import {
  buildSuperCallsForChain,
  buildSuperCallsForChain2,
} from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { ContractDefinition } from '../solc/ast-node';
import { Artifact } from '../solc/artifact';
import { ArtifactsMap } from '../artifacts-map';
import { ContractResolver } from '../transform';
import { matchFrom } from '../utils/match-from';

function getVarInitsPart(contractNode: ContractDefinition, source: string): string {
  return getVarInits(contractNode, source)
    .map(([vr, , match]) => `\n        ${vr.name} ${match[2]};`)
    .join('');
}

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
  _: unknown,
  original: string,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    const constructorNode = getConstructor(contractNode);
    if (constructorNode) {
      const [ctorStart] = getSourceIndices(constructorNode);
      // TODO: support struct arguments in initializers
      const match = matchFrom(original, /{/, ctorStart);
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

export function* transformConstructor2(
  sourceUnit: SourceUnit,
  resolveContract: ContractResolver,
  original: string,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
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
      buildSuperCallsForChain2(contractNode, resolveContract, helper),
      [`__${name}_init_unchained(${argNames.join(', ')});`],
      `}`,
      ``,
      `function __${name}_init_unchained(${argsList}) internal initializer {`,
      varInitNodes.map(v => `${v.name} = ${helper.read(v.value!)};`),
      `}`,
    ];

    if (constructorNode) {
      const [ctorStart] = getSourceIndices(constructorNode);
      // TODO: support struct arguments in initializers
      const match = matchFrom(original, /{/, ctorStart);
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
          const [, argsList] = source.match(/\((.*?)\)/)!;
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

      const brace = original.indexOf('{', after);

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

export function* transformConstructor(
  contractNode: ContractDefinition,
  source: string,
  contracts: Artifact[],
  contractsToArtifactsMap: ArtifactsMap,
): Generator<Transformation> {
  if (contractNode.contractKind !== 'contract') {
    return;
  }

  const superCalls = buildSuperCallsForChain(contractNode, contracts, contractsToArtifactsMap);

  const declarationInserts = getVarInitsPart(contractNode, source);

  const constructorNode = getConstructor(contractNode);

  let constructorBodySource = '';
  let constructorParameterList = '';
  let constructorArgsList = '';

  if (constructorNode) {
    if (constructorNode.body == null) {
      throw new Error('Missing body for constructor definition');
    }
    constructorBodySource = stripBraces(getNodeSources(constructorNode.body, source)[2]);
    constructorParameterList = stripBraces(getNodeSources(constructorNode.parameters, source)[2]);
    constructorArgsList = constructorNode.parameters.parameters.map(par => par.name).join(', ');
  }

  let bounds: { start: number; length: number };

  if (constructorNode) {
    const [start, len] = getNodeSources(constructorNode, source);
    bounds = {
      start,
      length: len,
    };
  } else {
    const [contractStart, , contractSource] = getNodeSources(contractNode, source);
    const match = /.*\bcontract[^{]*{/.exec(contractSource);
    if (match == undefined) {
      throw new Error(`Can't find contract pattern in ${contractSource}`);
    }
    const inside = contractStart + match[0].length;
    bounds = {
      start: inside,
      length: 0,
    };
  }

  yield {
    ...bounds,
    kind: 'transform-constructor',
    text: `
    function __${contractNode.name}_init(${constructorParameterList}) internal initializer {${superCalls}
        __${contractNode.name}_init_unchained(${constructorArgsList});
    }

    function __${contractNode.name}_init_unchained(${constructorParameterList}) internal initializer {
        ${declarationInserts}
        ${constructorBodySource}
    }\n`,
  };
}
