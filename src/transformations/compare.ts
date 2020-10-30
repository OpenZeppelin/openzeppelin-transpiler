import { Transformation, Bounds } from './type';

export function compareTransformations(a: Transformation, b: Transformation): number {
  const c = containment(a, b);

  if (c === 'partial overlap') {
    throw new Error(`Transformations ${a.kind} and ${b.kind} overlap`);
  } else if (c === 'disjoint') {
    return a.start - b.start;
  } else if (c === 'shared bound' && a.length * b.length === 0) {
    // segments share an end but one of them is length zero
    // sort them by midpoint
    return a.start + a.length / 2 - (b.start + b.length / 2);
  } else {
    // segments are contained one inside the other
    // sort by length
    return a.length - b.length;
  }
}

type Containment = 'disjoint' | 'partial overlap' | 'fully contained' | 'shared bound';

export function containment(a: Bounds, b: Bounds): Containment {
  const a_end = a.start + a.length;
  const b_end = b.start + b.length;

  const x = (a.start - b.start) * (a_end - b_end);

  if (x < 0) {
    return 'fully contained';
  }
  if (x === 0) {
    return 'shared bound';
  } else if (a.start + a.length <= b.start || b.start + b.length <= a.start) {
    return 'disjoint';
  } else {
    return 'partial overlap';
  }
}
