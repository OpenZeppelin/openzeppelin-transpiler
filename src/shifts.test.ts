import test from 'ava';

import { shiftBounds } from './shifts';

test('shift start', t => {
  const original = { start: 1, length: 2 };
  const offsets = [{ location: 0, amount: 1, lengthZero: false }];
  const shifted = { start: 2, length: 2 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

test('shift start overlapping', t => {
  const original = { start: 1, length: 2 };
  const offsets = [{ location: 1, amount: 1, lengthZero: false }];
  const shifted = { start: 2, length: 2 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

test('shift length', t => {
  const original = { start: 1, length: 2 };
  const offsets = [{ location: 2, amount: 1, lengthZero: false }];
  const shifted = { start: 1, length: 3 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

test('shift length overlapping length nonzero', t => {
  const original = { start: 1, length: 2 };
  const offsets = [{ location: 3, amount: 1, lengthZero: false }];
  const shifted = { start: 1, length: 3 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

test('shift length overlapping length zero', t => {
  const original = { start: 1, length: 2 };
  const offsets = [{ location: 3, amount: 1, lengthZero: true }];
  const shifted = { start: 1, length: 2 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

test('shift start and length', t => {
  const original = { start: 1, length: 2 };
  const offsets = [
    { location: 0, amount: 1, lengthZero: false },
    { location: 2, amount: 1, lengthZero: false },
  ];
  const shifted = { start: 2, length: 3 };
  t.deepEqual(shifted, shiftBounds(offsets, original));
});

