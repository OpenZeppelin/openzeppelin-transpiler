export function matchFrom(str: string, re: RegExp, index: number): RegExpExecArray | null {
  const re2 = new RegExp(re, 'g');
  re2.lastIndex = index;
  return re2.exec(str);
}
