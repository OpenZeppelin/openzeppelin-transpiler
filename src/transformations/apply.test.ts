import test from 'ava';

import { applyTransformations, shiftBounds } from './apply';
import { Transformation } from './type';

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

test('apply non overlapping length preserved', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: '00' };
  const b = { kind: 'b', start: 2, length: 2, text: '00' };
  t.is('00004567', applyTransformations('', source, [a, b]));
});

test('apply contained length preserved', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 2, length: 2, text: '00' };
  const b = { kind: 'b', start: 0, length: 6, text: '000000' };
  t.is('00000067', applyTransformations('', source, [a, b]));
});

test('apply non overlapping contracted', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: 'a' };
  const b = { kind: 'b', start: 2, length: 2, text: 'b' };
  const c = { kind: 'c', start: 4, length: 2, text: 'c' };
  t.is('abc67', applyTransformations('', source, [a, b, c]));
});

test('apply non overlapping expanded', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: 'aaa' };
  const b = { kind: 'b', start: 2, length: 2, text: 'bbb' };
  const c = { kind: 'c', start: 4, length: 2, text: 'ccc' };
  t.is('aaabbbccc67', applyTransformations('', source, [a, b, c]));
});

test('apply realistic transformations', t => {
  const source = 'a x = b(0);';
  const a = { kind: 'a', start: 0, length: 1, text: 'aaaaaaa' };
  const b = { kind: 'b', start: 6, length: 1, text: 'bbbbbbb' };
  const c = { kind: 'c', start: 3, length: 7, text: '' };
  t.is('aaaaaaa x;', applyTransformations('', source, [a, b, c]));
});

test('apply overlapping transformations', t => {
  const source = 'a x = b(0); a x = b(0);';
  const a = { kind: 'a', start: 0, length: 1, text: 'aaaa' };
  const b = { kind: 'b', start: 6, length: 1, text: 'bbbb' };
  const c = { kind: 'c', start: 3, length: 7, text: '' };
  const d = { kind: 'd', start: 11, length: 0, text: ' d;' };
  t.is('aaaa x; d; a x = b(0);', applyTransformations('', source, [a, b, c, d]));
});

test('apply non overlapping with function transformation', t => {
  const source = '01234567';
  const a = {
    kind: 'a',
    start: 0,
    length: 2,
    transform: (s: string) => s + '.',
  };
  t.is('01.234567', applyTransformations('', source, [a]));
});

test('apply contained with function transformation', t => {
  const source = 'abcdef';
  const a = { kind: 'a', start: 2, length: 2, text: 'xyz' };
  const b = {
    kind: 'b',
    start: 1,
    length: 4,
    transform: (s: string) => s.toUpperCase(),
  };
  t.is('aBXYZEf', applyTransformations('', source, [a, b]));
});

test('apply with function transformation and readShifted', t => {
  const source = 'abcdef';
  const a = { kind: 'a', start: 2, length: 2, text: 'xyz' };
  const b: Transformation = {
    kind: 'b',
    start: 0,
    length: 6,
    transform: (_, read) => read({ start: 1, length: 4 }),
  };
  t.is('bxyze', applyTransformations('', source, [a, b]));
});

test('apply with invalid readShifted bounds', t => {
  const source = 'abcdef';
  const a = { kind: 'a', start: 2, length: 2, text: 'xyz' };
  const b: Transformation = {
    kind: 'b',
    start: 0,
    length: 6,
    transform: (_, read) => read({ start: 3, length: 2 }),
  };
  t.throws(() => applyTransformations('', source, [a, b]));
});
