import { Transformation } from './type';

interface Shift {
  amount: number;
  location: number;
  lengthZero: boolean;
}

export function applyTransformations(sourcePath: string, source: string, transformations: Transformation[]): string {
  const sorted = sortTransformations(transformations, sourcePath);
  const shifts: Shift[] = [];

  return sorted.reduce((output, t) => {
    const st = shiftTransformation(shifts, t);
    const [pre, mid, post] = split(output, st.start, st.length);
    shifts.push({
      amount: t.text.length - t.length,
      location: t.start + t.length,
      lengthZero: t.length === 0,
    });
    const n = [pre, t.text, post].join('');
    return n;
  }, source);
}

export function shiftTransformation(shifts: Shift[], t: Transformation): Transformation {
  const end = t.start + t.length;

  let startOffset = 0;
  let lengthOffset = 0;

  for (const s of shifts) {
    if (s.location <= t.start) {
      startOffset += s.amount;
    } else if (s.location < end || (s.location === end && !s.lengthZero)) {
      lengthOffset += s.amount;
    }
  }

  return { ...t, start: t.start + startOffset, length: t.length + lengthOffset };
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
