import test from 'ava';

import { applyTransformation } from './apply';
import { Transformation, TransformHelper } from './type';
import { Shift } from '../shifts';

const defaultHelper: TransformHelper = {
  read() {
    throw new Error('unimplemented');
  },
};

function applyAll(content: string, ts: Transformation[], helper = defaultHelper): string {
  const shifts: Shift[] = [];
  return ts
    .reduce((content: Buffer, t: Transformation) => {
      const { result, shift } = applyTransformation(t, content, shifts, helper);
      shifts.push(shift);
      return result;
    }, Buffer.from(content))
    .toString();
}

test('apply non overlapping length preserved', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: '00' };
  const b = { kind: 'b', start: 2, length: 2, text: '00' };
  t.is('00004567', applyAll(source, [a, b]));
});

test('apply contained length preserved', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 2, length: 2, text: '00' };
  const b = { kind: 'b', start: 0, length: 6, text: '000000' };
  t.is('00000067', applyAll(source, [a, b]));
});

test('apply non overlapping contracted', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: 'a' };
  const b = { kind: 'b', start: 2, length: 2, text: 'b' };
  const c = { kind: 'c', start: 4, length: 2, text: 'c' };
  t.is('abc67', applyAll(source, [a, b, c]));
});

test('apply non overlapping expanded', t => {
  const source = '01234567';
  const a = { kind: 'a', start: 0, length: 2, text: 'aaa' };
  const b = { kind: 'b', start: 2, length: 2, text: 'bbb' };
  const c = { kind: 'c', start: 4, length: 2, text: 'ccc' };
  t.is('aaabbbccc67', applyAll(source, [a, b, c]));
});

test('apply realistic transformations', t => {
  const source = 'a x = b(0);';
  const a = { kind: 'a', start: 0, length: 1, text: 'aaaaaaa' };
  const b = { kind: 'b', start: 6, length: 1, text: 'bbbbbbb' };
  const c = { kind: 'c', start: 3, length: 7, text: '' };
  t.is('aaaaaaa x;', applyAll(source, [a, b, c]));
});

test('apply overlapping transformations', t => {
  const source = 'a x = b(0); a x = b(0);';
  const a = { kind: 'a', start: 0, length: 1, text: 'aaaa' };
  const b = { kind: 'b', start: 6, length: 1, text: 'bbbb' };
  const c = { kind: 'c', start: 3, length: 7, text: '' };
  const d = { kind: 'd', start: 11, length: 0, text: ' d;' };
  t.is('aaaa x; d; a x = b(0);', applyAll(source, [a, b, c, d]));
});

test('apply non overlapping with function transformation', t => {
  const source = '01234567';
  const a = {
    kind: 'a',
    start: 0,
    length: 2,
    transform: (s: string) => s + '.',
  };
  t.is('01.234567', applyAll(source, [a]));
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
  t.is('aBXYZEf', applyAll(source, [a, b]));
});

test('apply two stacked transformations of length zero', t => {
  const source = 'xxyy';
  const a = { kind: 'a', start: 2, length: 0, text: 'aa' };
  const b = { kind: 'b', start: 2, length: 0, text: 'bb' };
  t.is('xxaabbyy', applyAll(source, [a, b]));
});
