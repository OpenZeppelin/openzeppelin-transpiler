import { Transformation } from './type';

export function applyTransformations(sourcePath: string, source: string, transformations: Transformation[]): string {
  let cursor = 0;

  const sorted = transformations.sort((a, b) => {
    return a.start - b.start;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.end > b.start) {
      throw new Error(
        `${sourcePath}: transformations ${a.kind} and ${b.kind} overlap`,
      );
    }
  }

  let transformedSource = sorted.reduce((output, trans) => {
    const { start, end, text } = trans;
    output += source.slice(cursor, start);
    output += text;
    cursor = end;
    return output;
  }, '');

  transformedSource += source.slice(cursor);
  return transformedSource;
}
