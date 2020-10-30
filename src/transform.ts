import { mapValues } from 'lodash';

import { SourceUnit } from 'solidity-ast';
import { SolcInput, SolcOutput } from './solc/output';
import { srcDecoder, SrcDecoder } from './solc/src-decoder';

import { Shift, shiftBounds } from './shifts';
import { applyTransformation } from './transformations/apply';
import { compareTransformations, containment } from './transformations/compare';
import { Transformation, WithSrc } from './transformations/type';

type Transformer = (sourceUnit: SourceUnit) => Generator<Transformation>;

interface TransformState {
  transformations: Transformation[];
  shifts: Shift[];
  content: string;
}

export class Transform {
  state: {
    [file in string]: TransformState;
  };

  decodeSrc: SrcDecoder;

  constructor(input: SolcInput, readonly output: SolcOutput) {
    this.decodeSrc = srcDecoder(output);
    this.state = mapValues(input.sources, (s, sourcePath) => {
      if (!('content' in s)) {
        throw new Error(`Missing content for ${sourcePath}`);
      }
      return {
        content: s.content,
        transformations: [],
        shifts: [],
      };
    });
  }

  apply(transform: Transformer): void {
    for (const source in this.output.sources) {
      for (const t of transform(this.output.sources[source].ast)) {
        const { content, shifts, transformations } = this.state[source];

        transformations.push(t);
        transformations.sort(compareTransformations);

        const { result, shift } = applyTransformation(t, content, shifts, this);

        shifts.push(shift);

        this.state[source].content = result;
      }
    }
  }

  read(node: WithSrc): string {
    const { source, ...bounds } = this.decodeSrc(node.src);
    const { shifts, transformations, content } = this.state[source];
    const sb = shiftBounds(shifts, bounds);
    if (transformations.some(t => containment(sb, t) === 'partial overlap')) {
      throw new Error(`Can't read from segment that has been partially transformed`);
    }
    return content.slice(sb.start, sb.start + sb.length);
  }

  results(): { [file in string]: string } {
    return mapValues(this.state, s => s.content);
  }
}
