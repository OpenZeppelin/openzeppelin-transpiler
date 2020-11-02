import { Transformation, WithSrc, TransformHelper } from './type';
import { getSourceIndices } from '../solc/ast-utils';
import { Shift, shiftBounds } from '../shifts';

import { compareTransformations, containment } from './compare';

interface ApplyResult {
  result: string;
  shift: Shift;
}

export function applyTransformation(
  t: Transformation,
  content: string,
  shifts: Shift[],
  helper: TransformHelper,
): ApplyResult {
  const sb = shiftBounds(shifts, t);
  const [pre, mid, post] = split(content, sb.start, sb.length);
  const text = 'text' in t ? t.text : t.transform(mid, helper);

  const shift = {
    amount: text.length - sb.length,
    location: t.start + t.length,
    lengthZero: t.length === 0,
  };

  const result = [pre, text, post].join('');

  return { result, shift };
}

export function split(source: string, start: number, length: number): [string, string, string] {
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
