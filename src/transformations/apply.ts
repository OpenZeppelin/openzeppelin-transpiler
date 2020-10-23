import { Transformation } from './type';

export function applyTransformations(sourcePath: string, source: string, transformations: Transformation[]): string {
  const sorted = sortTransformations(transformations, sourcePath);

  let offset = 0;
  let cursor = 0;

  return sorted.reduce((output, t) => {
    const start = t.start < cursor ? t.start : t.start + offset;
    const length = t.start < cursor ? t.length + offset : t.length;
    const [pre, mid, post] = split(output, start, length);
    offset += t.text.length - t.length;
    cursor = t.start + t.length;
    return [pre, t.text, post].join('');
  }, source);
}

function split(source: string, start: number, length: number): [string, string, string] {
  const pre = source.slice(0, start);
  const mid = source.slice(start, start + length);
  const post = source.slice(start + length);
  return [pre, mid, post];
}

export function sortTransformations(transformations: Transformation[], sourcePath: string): Transformation[] {
  for (const t of transformations) {
    if (t.length < 0) {
      throw new Error(`${sourcePath}: transformation ${t.kind} has negative length`);
    }
  }

  return transformations.sort((a, b) => {
    const a_end = a.start + a.length;
    const b_end = b.start + b.length;

    const x = (a.start - b.start) * (a_end - b_end);

    if (x > 0) {
      // segments are not contained one inside the other
      if (a_end <= b.start || b_end <= a.start) {
        return a.start - b.start
      } else {
        throw new Error(
          `${sourcePath}: transformations ${a.kind} and ${b.kind} overlap`,
        );
      }
    } else if (x === 0 && (a.length * b.length) === 0) {
      // segments share an end but one of them is length zero
      // sort them by midpoint
      return (a.start + a.length / 2) - (b.start + b.length / 2);
    } else {
      // segments are contained one inside the other
      // sort by length
      return a.length - b.length;
    }
  });
}
