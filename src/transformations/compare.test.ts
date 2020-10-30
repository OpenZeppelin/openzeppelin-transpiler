import test from 'ava';

import { Transformation } from './type';
import { compareTransformations } from './compare';

function sortTransformations(ts: Transformation[]): Transformation[] {
  return Array.from(ts).sort(compareTransformations);
}

test('sort non overlapping', t => {
  const b = { kind: 'b', start: 2, length: 1, text: '' };
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  t.deepEqual([a, b], sortTransformations([a, b]));
  t.deepEqual([a, b], sortTransformations([b, a]));
});

test('sort contained', t => {
  const a = { kind: 'a', start: 1, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 4, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a]));
  t.deepEqual([a, b], sortTransformations([a, b]));
});

test('reject partial overlap', t => {
  const a = { kind: 'a', start: 1, length: 2, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.throws(() => sortTransformations([b, a]));
});

test('sort contained with shared end', t => {
  const a = { kind: 'a', start: 1, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a]));
  t.deepEqual([a, b], sortTransformations([a, b]));
});

test('sort contained with shared start', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 2, text: '' };
  t.deepEqual([a, b], sortTransformations([b, a]));
  t.deepEqual([a, b], sortTransformations([a, b]));
});

test('sort equal lengths', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 0, length: 1, text: '' };
  sortTransformations([b, a]);
  t.pass();
});

test('sort length zero as not overlapping', t => {
  const a = { kind: 'a', start: 0, length: 1, text: '' };
  const b = { kind: 'b', start: 1, length: 0, text: '' };
  const c = { kind: 'c', start: 1, length: 1, text: '' };
  t.deepEqual([a, b, c], sortTransformations([a, b, c]));
  t.deepEqual([a, b, c], sortTransformations([b, a, c]));
  t.deepEqual([a, b, c], sortTransformations([c, a, b]));
});

test('sort complex', t => {
  const tf = (kind: string, start: number, length: number) => ({
    kind,
    start,
    length,
    text: '',
  });
  const a = tf('a', 0, 1); // x
  const b = tf('b', 4, 1); //     x
  const c = tf('c', 6, 1); //       x
  const d = tf('d', 3, 5); //    xxxxx
  const e = tf('e', 9, 1); //          x
  const f = tf('f', 2, 9); //   xxxxxxxxx
  // 0123456789A
  t.deepEqual([a, b, c, d, e, f], sortTransformations([a, b, c, d, e, f]));
  t.deepEqual([a, b, c, d, e, f], sortTransformations([b, f, a, c, e, d]));
  t.deepEqual([a, b, c, d, e, f], sortTransformations([a, f, b, d, c, e]));
  t.deepEqual([a, b, c, d, e, f], sortTransformations([e, b, a, d, f, c]));
});

