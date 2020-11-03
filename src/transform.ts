import { mapValues } from 'lodash';

import { SourceUnit } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { SolcInput, SolcOutput } from './solc/input-output';
import { srcDecoder, SrcDecoder } from './solc/src-decoder';

import { Shift, shiftBounds } from './shifts';
import { applyTransformation } from './transformations/apply';
import { compareTransformations, compareContainment } from './transformations/compare';
import { Transformation, WithSrc } from './transformations/type';
import { isRenamed } from './rename';
import { ASTResolver } from './ast-resolver';

type Transformer = (sourceUnit: SourceUnit, tools: TransformerTools) => Generator<Transformation>;

export interface TransformerTools {
  originalSource: string;
  readOriginal: (node: Node) => string;
  resolver: ASTResolver;
  isExcluded: (node: Node) => boolean;
}

interface TransformState {
  transformations: Transformation[];
  shifts: Shift[];
  content: string;
  original: string;
}

export class Transform {
  state: {
    [file in string]: TransformState;
  } = {};

  decodeSrc: SrcDecoder;
  resolver: ASTResolver;
  isExcluded: (node: Node) => boolean;

  constructor(input: SolcInput, readonly output: SolcOutput, exclude: string[] = []) {
    this.decodeSrc = srcDecoder(output);
    this.resolver = new ASTResolver(output);

    this.isExcluded = node => node.nodeType === 'ContractDefinition' && exclude.includes(node.name);

    for (const source in input.sources) {
      if (isRenamed(source)) {
        continue;
      }

      const s = input.sources[source];
      if (!('content' in s)) {
        throw new Error(`Missing content for ${source}`);
      }

      this.state[source] = {
        original: s.content,
        content: s.content,
        transformations: [],
        shifts: [],
      };
    }
  }

  apply(transform: Transformer): void {
    for (const source in this.state) {
      const { original: originalSource } = this.state[source];
      const { resolver, isExcluded } = this;
      const readOriginal = this.readOriginal.bind(this);
      const tools = { originalSource, resolver, isExcluded, readOriginal };

      for (const t of transform(this.output.sources[source].ast, tools)) {
        const { content, shifts, transformations } = this.state[source];
        insertSortedAndValidate(transformations, t);

        const { result, shift } = applyTransformation(t, content, shifts, this);

        shifts.push(shift);

        this.state[source].content = result;
      }
    }
  }

  readOriginal(node: WithSrc): string {
    const { source, start, length } = this.decodeSrc(node.src);
    const { original } = this.state[source];
    return original.slice(start, start + length);
  }

  read(node: WithSrc): string {
    const { source, ...bounds } = this.decodeSrc(node.src);
    const { shifts, transformations, content } = this.state[source];

    const incompatible = (t: Transformation) => {
      const c = compareContainment(t, bounds);
      return c === 'partial overlap' || (typeof c === 'number' && c > 0);
    };
    if (transformations.some(incompatible)) {
      throw new Error(`Can't read from segment that has been partially transformed`);
    }

    const sb = shiftBounds(shifts, bounds);
    return content.slice(sb.start, sb.start + sb.length);
  }

  results(): { [file in string]: string } {
    return mapValues(this.state, s => s.content);
  }
}

function insertSortedAndValidate(transformations: Transformation[], t: Transformation): void {
  transformations.push(t);
  transformations.sort(compareTransformations); // checks for overlaps
  for (let i = transformations.indexOf(t) + 1; i < transformations.length; i += 1) {
    const s = transformations[i];
    const c = compareContainment(t, s);
    if (typeof c === 'number' && c < 0) {
      throw new Error(`A bigger area has already been transformed (${s.kind} > ${t.kind})`);
    }
  }
}
