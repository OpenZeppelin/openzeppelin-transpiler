import { Transformation, Bounds, WithSrc } from './type';
import { getSourceIndices } from '../solc/ast-utils';

import { compareTransformations, containment } from './compare';

interface Shift {
  amount: number;
  location: number;
  lengthZero: boolean;
}

export function applyTransformations(
  sourcePath: string,
  source: string,
  transformations: Transformation[],
): string {
  // check that there are no partially overlapping transformations
  sortTransformations(transformations, sourcePath);

  const shifts: Shift[] = [];

  return transformations.reduce((output, t, i) => {
    const sb = shiftBounds(shifts, t);
    const [pre, mid, post] = split(output, sb.start, sb.length);

    const read = (node: WithSrc) => {
      const [start, length] = getSourceIndices(node);
      const sb = shiftBounds(shifts, { start, length });
      if (transformations.slice(0, i).some(t => containment(sb, t) === 'partial overlap')) {
        throw new Error(`Can't read from segment that has been partially transformed`);
      }
      return output.slice(sb.start, sb.start + sb.length);
    };

    const text = 'text' in t ? t.text : t.transform(mid, { read });

    shifts.push({
      amount: text.length - sb.length,
      location: t.start + t.length,
      lengthZero: t.length === 0,
    });
    const n = [pre, text, post].join('');
    return n;
  }, source);
}

export function shiftBounds(shifts: Shift[], b: Bounds): Bounds {
  const end = b.start + b.length;

  let startOffset = 0;
  let lengthOffset = 0;

  for (const s of shifts) {
    if (s.location <= b.start) {
      startOffset += s.amount;
    } else if (s.location < end || (s.location === end && !s.lengthZero)) {
      lengthOffset += s.amount;
    }
  }

  return { start: b.start + startOffset, length: b.length + lengthOffset };
}

function split(source: string, start: number, length: number): [string, string, string] {
  const pre = source.slice(0, start);
  const mid = source.slice(start, start + length);
  const post = source.slice(start + length);
  return [pre, mid, post];
}

export function sortTransformations(
  transformations: Transformation[],
  sourcePath: string,
): Transformation[] {
  for (const t of transformations) {
    if (t.length < 0) {
      throw new Error(`${sourcePath}: transformation ${t.kind} has negative length`);
    }
  }

  return Array.from(transformations).sort(compareTransformations);
}
