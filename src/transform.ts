import { mapValues } from 'lodash';

import { SourceUnit } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { SolcInput, SolcOutput } from './solc/input-output';
import { srcDecoder, SrcDecoder } from './solc/src-decoder';
import { layoutGetter, LayoutGetter } from './solc/layout-getter';

import { Shift, shiftBounds } from './shifts';
import { applyTransformation } from './transformations/apply';
import { compareTransformations, compareContainment } from './transformations/compare';
import { Bounds, Transformation, WithSrc } from './transformations/type';
import { ASTResolver } from './ast-resolver';
import { ByteMatch, matchBufferAt } from './utils/match';

type Transformer = (sourceUnit: SourceUnit, tools: TransformerTools) => Generator<Transformation>;

interface ReadOriginal {
  (node: Node, type?: 'string'): string;
  (node: Node, type: 'buffer'): Buffer;
}

export interface TransformerTools {
  originalSource: string;
  originalSourceBuf: Buffer;
  readOriginal: ReadOriginal;
  matchOriginalAfter: (node: Node, re: RegExp) => ByteMatch | undefined;
  resolver: ASTResolver;
  getData: (node: Node) => Partial<TransformData>;
  getLayout: LayoutGetter;
  error: (node: Node, msg: string) => Error;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TransformData {}

interface TransformState {
  id: number;
  ast: SourceUnit;
  transformations: Transformation[];
  shifts: Shift[];
  content: Buffer;
  original: string;
  originalBuf: Buffer;
}

interface TransformOptions {
  exclude?: (source: string) => boolean;
}

export class Transform {
  private state: {
    [file in string]: TransformState;
  } = {};

  private data = new WeakMap<Node, Partial<TransformData>>();

  readonly decodeSrc: SrcDecoder;
  readonly getLayout: LayoutGetter;
  readonly resolver: ASTResolver;

  constructor(input: SolcInput, output: SolcOutput, options: TransformOptions = {}) {
    this.decodeSrc = srcDecoder(output);
    this.getLayout = layoutGetter(output);
    this.resolver = new ASTResolver(output, options.exclude);

    for (const source in input.sources) {
      if (options.exclude?.(source)) {
        continue;
      }

      const s = input.sources[source];
      if (!('content' in s)) {
        throw new Error(`Missing content for ${source}`);
      }

      const contentBuf = Buffer.from(s.content);
      this.state[source] = {
        id: output.sources[source].id,
        ast: output.sources[source].ast,
        original: s.content,
        originalBuf: contentBuf,
        content: contentBuf,
        transformations: [],
        shifts: [],
      };
    }
  }

  apply(transform: Transformer): void {
    for (const source in this.state) {
      const { original: originalSource, originalBuf: originalSourceBuf, ast } = this.state[source];
      const { resolver, getLayout } = this;
      const readOriginal = this.readOriginal.bind(this);
      const getData = this.getData.bind(this);
      const error = this.error.bind(this);
      const matchOriginalAfter = this.matchOriginalAfter.bind(this);
      const tools: TransformerTools = {
        originalSource,
        originalSourceBuf,
        resolver,
        readOriginal,
        getData,
        getLayout,
        error,
        matchOriginalAfter,
      };

      for (const t of transform(ast, tools)) {
        const { id, content, shifts, transformations } = this.state[source];
        const error = (byteIndex: number, msg: string) =>
          this.error({ src: `${byteIndex}:0:${id}` }, msg);
        insertSortedAndValidate(transformations, t, error);

        const { result, shift } = applyTransformation(t, content, shifts, this);

        shifts.push(shift);

        this.state[source].content = result;
      }
    }
  }

  getData(node: Node): Partial<TransformData> {
    let data = this.data.get(node);
    if (data === undefined) {
      data = {};
      this.data.set(node, data);
    }
    return data;
  }

  readOriginal(node: WithSrc, type?: 'string'): string;
  readOriginal(node: WithSrc, type: 'buffer'): Buffer;
  readOriginal(node: WithSrc, type: 'string' | 'buffer' = 'string'): string | Buffer {
    const { source, start, length } = this.decodeSrc(node.src);
    const { originalBuf } = this.state[source];
    const buf = originalBuf.slice(start, start + length);
    if (type === 'buffer') {
      return buf;
    } else {
      return buf.toString('utf8');
    }
  }

  read(node: WithSrc): string {
    const { source } = this.decodeSrc(node.src);
    const { content } = this.state[source];
    const sb = this.getShiftedBounds(node);
    return content.slice(sb.start, sb.start + sb.length).toString();
  }

  getShiftedBounds(node: WithSrc): Bounds {
    const { source, ...bounds } = this.decodeSrc(node.src);
    const { shifts, transformations } = this.state[source];

    const incompatible = (t: Transformation) => {
      const c = compareContainment(t, bounds);
      return c === 'partial overlap' || (typeof c === 'number' && c > 0);
    };
    if (transformations.some(incompatible)) {
      throw new Error(`Can't read from segment that has been partially transformed`);
    }

    return shiftBounds(shifts, bounds);
  }

  error(node: WithSrc, msg: string): Error {
    const { source, start } = this.decodeSrc(node.src);
    const line = byteToLineNumber(this.state[source].originalBuf, start);
    const error = new Error(`${msg} (${source}:${line})`);
    Error.captureStackTrace(error, this.error); // capture stack trace without this function
    return error;
  }

  matchOriginalAfter(node: Node, re: RegExp): ByteMatch | undefined {
    const { source, start, length } = this.decodeSrc(node.src);
    const buf = this.state[source].originalBuf;
    return matchBufferAt(buf, re, start + length);
  }

  results(): { [file in string]: string } {
    return mapValues(this.state, s => s.content.toString());
  }

  asts(): SourceUnit[] {
    return Object.values(this.state).map(s => s.ast);
  }

  exclude(source: string) {
    delete this.state[source];
  }
}

function insertSortedAndValidate(
  transformations: Transformation[],
  t: Transformation,
  error: (byteIndex: number, msg: string) => Error,
): void {
  transformations.push(t);
  transformations.sort(compareTransformations); // checks for overlaps
  for (let i = transformations.indexOf(t) + 1; i < transformations.length; i += 1) {
    const s = transformations[i];
    const c = compareContainment(t, s);
    if (typeof c === 'number' && c < 0) {
      throw error(s.start, `A bigger area has already been transformed (${s.kind} > ${t.kind})`);
    }
  }
}
function byteToLineNumber(buf: Buffer, byteIndex: number): number {
  return buf.slice(0, byteIndex).toString('utf8').split('\n').length;
}
