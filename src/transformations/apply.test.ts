import test from 'ava';

import { applyTransformations, sortTransformations } from './apply';

test('sort non overlapping', t => {
  const b = { kind: 'b', start: 2, length: 1, text: '' };
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  t.deepEqual([a, b], sortTransformations([a, b], ''));
  t.deepEqual([a, b], sortTransformations([b, a], ''));
});

test('sort contained', t => {
  const a = { kind: 'a', start: 1, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 4, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a], ''));
  t.deepEqual([a, b], sortTransformations([a, b], ''));
});

test('reject partial overlap', t => {
  const a = { kind: 'a', start: 1, length: 2, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.throws(() => sortTransformations([b, a], ''));
});

test('sort contained with shared end', t => {
  const a = { kind: 'a', start: 1, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a], ''));
  t.deepEqual([a, b], sortTransformations([a, b], ''));
});

test('sort contained with shared start', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a], ''));
  t.deepEqual([a, b], sortTransformations([a, b], ''));
});

test('sort equal lengths', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 1, text: '' };
  sortTransformations([b, a], '');
  t.pass();
});

test('consider non-overlapping if length zero', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 1, length: 0, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a], ''));
  t.deepEqual([a, b], sortTransformations([a, b], ''));
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
