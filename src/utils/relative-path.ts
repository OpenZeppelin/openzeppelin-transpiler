import path from 'path';

// does the same as path.relative but the result always begins with .
export function relativePath(from: string, to: string): string {
  const rel = path.relative(from, to);
  if (rel.startsWith('.')) {
    return rel;
  } else {
    return './' + rel;
  }
}
