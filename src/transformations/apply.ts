import { Transformation, Bounds } from './type';

interface Shift {
  amount: number;
  location: number;
  lengthZero: boolean;
}

export function applyTransformations(sourcePath: string, source: string, transformations: Transformation[]): string {
  const sorted = sortTransformations(transformations, sourcePath);
  const shifts: Shift[] = [];

  return sorted.reduce((output, t) => {
    const sb = shiftBounds(shifts, t);
    const [pre, mid, post] = split(output, sb.start, sb.length);

    const readShifted = (b: Bounds) => {
      const sb = shiftBounds(shifts, b);
      return output.slice(sb.start, sb.start + sb.length);
    };

    const text = 'text' in t ? t.text : t.transform(mid, readShifted);

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
