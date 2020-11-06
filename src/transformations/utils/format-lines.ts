import { flatten } from 'lodash';

export type Line = string | Line[];

export function formatLines(indent: number, lines: Line[]): string {
  function indentEach(indent: number, lines: Line[]): Line[] {
    return lines.map(line =>
      Array.isArray(line) ? indentEach(indent + 1, line) : line && '    '.repeat(indent) + line,
    );
  }
  return flatten(indentEach(indent, lines)).join('\n') + '\n';
}
