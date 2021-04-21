import test from 'ava';

import { matcher } from './matcher';

test('no patterns', t => {
  t.is(matcher([])('a'), undefined);
});

test('no negative patterns', t => {
  t.true(matcher(['a*'])('a'));
  t.is(matcher(['b*'])('a'), undefined);
});

test('excluded by a negative pattern', t => {
  t.false(matcher(['a*', '!a'])('a'));
});

test('no positive patterns', t => {
  t.false(matcher(['!a'])('a'));
  t.is(matcher(['!b'])('a'), undefined);
});
