import { Transformation } from './type';

export function applyTransformations(sourcePath: string, source: string, transformations: Transformation[]): string {
  const sorted = sortTransformations(transformations, sourcePath);

  let offset = 0;
  let cursor = 0;

  return sorted.reduce((output, t) => {
    const start = t.start < cursor ? t.start : t.start + offset;
    const length = t.start < cursor ? t.length + offset : t.length;
    const [pre, mid, post] = split(output, start, length);
    const text = 'text' in t ? t.text : t.transform(mid);
    offset += text.length - t.length;
    cursor = t.start + t.length;
    return [pre, text, post].join('');
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
    // return a.start - b.start;
    const a_end = a.start + a.length;
    const b_end = b.start + b.length;

    if (a_end <= b.start || b_end <= a.start) {
      return a.start - b.start
    } else if ((a.start - b.start) * (a_end - b_end) <= 0) {
      // in this case one is contained in the other
      // we compare by length
      return a.length - b.length;
    } else {
      throw new Error(
        `${sourcePath}: transformations ${a.kind} and ${b.kind} overlap`,
      );
    }
  });
}
