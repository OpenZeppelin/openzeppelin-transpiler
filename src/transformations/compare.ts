import { Transformation, Bounds } from './type';

export function compareTransformations(a: Transformation, b: Transformation): number {
  const c = compareContainment(a, b);

  if (c === 'partial overlap') {
    throw new Error(`Transformations ${a.kind} and ${b.kind} overlap`);
  } else if (c === 'disjoint') {
    // sort by midpoint
    return a.start + a.length / 2 - (b.start + b.length / 2);
  } else {
    return c;
  }
}

type Containment = 'disjoint' | 'partial overlap' | 'fully contained' | 'shared bound';

export function containment(a: Bounds, b: Bounds): Containment {
  const a_end = a.start + a.length;
  const b_end = b.start + b.length;

  const x = (a.start - b.start) * (a_end - b_end);

  if (x < 0) {
    return 'fully contained';
  } else if (x === 0) {
    return 'shared bound';
  } else if (a.start + a.length <= b.start || b.start + b.length <= a.start) {
    return 'disjoint';
  } else {
    return 'partial overlap';
  }
}

export function compareContainment(a: Bounds, b: Bounds): number | 'disjoint' | 'partial overlap' {
  const a_end = a.start + a.length;
  const b_end = b.start + b.length;
  const x = (a.start - b.start) * (a_end - b_end);

  if (x > 0 || (x === 0 && a.length * b.length === 0)) {
    if (a.start === b.start && a.length === b.length) {
      return 0;
    } else if (a.start + a.length <= b.start || b.start + b.length <= a.start) {
      return 'disjoint';
    } else {
      return 'partial overlap';
    }
  } else {
    return a.length - b.length;
  }
}
