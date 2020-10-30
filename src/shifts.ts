import { Bounds } from './transformations/type';

export interface Shift {
  amount: number;
  location: number;
  lengthZero: boolean;
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
