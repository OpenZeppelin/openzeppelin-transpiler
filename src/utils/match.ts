export interface ByteMatch {
  start: number;
  length: number;
  captureLengths: number[];
}

function withFlags(re: RegExp, add: string, remove = '') {
  const flags = new Set(...re.flags);
  for (const f of add) {
    flags.add(f);
  }
  for (const f of remove) {
    flags.delete(f);
  }
  return new RegExp(re, [...flags].join(''));
}

function matchWithFlags(
  buf: Buffer,
  re: RegExp,
  index: number,
  flags: string,
): ByteMatch | undefined {
  const str = buf.slice(index).toString('utf8');
  const m = withFlags(re, flags).exec(str);
  if (m) {
    const start = index + Buffer.from(str.slice(0, m.index), 'utf8').length;
    const length = Buffer.from(str.slice(m.index, m.index + m[0].length), 'utf8').length;
    const captureLengths = m
      .slice(1)
      .map(c => (c === undefined ? c : Buffer.from(c, 'utf8').length));
    return { start, length, captureLengths };
  }
}

export function matchBuffer(buf: Buffer, re: RegExp): ByteMatch | undefined {
  return matchWithFlags(buf, re, 0, '');
}

export function matchBufferFrom(buf: Buffer, re: RegExp, index: number): ByteMatch | undefined {
  return matchWithFlags(buf, re, index, 'g');
}

export function matchBufferAt(buf: Buffer, re: RegExp, index: number): ByteMatch | undefined {
  return matchWithFlags(buf, re, index, 'y');
}
