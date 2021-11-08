import { Transformation, TransformHelper } from './type';
import { Shift, shiftBounds } from '../shifts';

import { compareTransformations } from './compare';

interface ApplyResult {
  result: Buffer;
  shift: Shift;
}

export function applyTransformation(
  t: Transformation,
  content: Buffer,
  shifts: Shift[],
  helper: TransformHelper,
): ApplyResult {
  const sb = shiftBounds(shifts, t);
  const [pre, mid, post] = split(content, sb.start, sb.length);
  const text = Buffer.from('text' in t ? t.text : t.transform(mid.toString(), helper));

  const shift = {
    amount: text.length - sb.length,
    location: t.start + t.length,
    lengthZero: t.length === 0,
  };

  const result = Buffer.concat([pre, text, post]);

  return { result, shift };
}

export function split(source: Buffer, start: number, length: number): [Buffer, Buffer, Buffer] {
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
