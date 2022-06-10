function withFlags(re: RegExp, add: string, remove: string = '') {
  const flags = new Set(...re.flags);
  for (const f of add) flags.add(f);
  for (const f of remove) flags.delete(f);
  return new RegExp(re, [...flags].join(''));
}

export function matchFrom(str: string, re: RegExp, index: number): RegExpExecArray | null {
  const re2 = withFlags(re, 'g');
  re2.lastIndex = index;
  return re2.exec(str);
}

export function matchAt(str: string, re: RegExp, index: number): RegExpExecArray | null {
  const re2 = withFlags(re, 'y');
  re2.lastIndex = index;
  return re2.exec(str);
}

function byteIndexToCharIndex(str: string, byteIndex: number): number {
  return Buffer.from(str, 'utf8').slice(0, byteIndex).toString('utf8').length;
}

export function matchAtByte(str: string, re: RegExp, byteIndex: number): RegExpExecArray | null {
  const charIndex = byteIndexToCharIndex(str, byteIndex);
  return matchAt(str, re, charIndex);
}
