import { Minimatch, IMinimatch } from 'minimatch';

export function matcher(patterns: string[]): (path: string) => boolean {
  const positivePatterns: IMinimatch[] = [];
  const negativePatterns: IMinimatch[] = [];

  for (const pat of patterns) {
    const m = new Minimatch(pat);
    if (m.negate) {
      negativePatterns.push(m);
    } else {
      positivePatterns.push(m);
    }
  }

  return path =>
    positivePatterns.some(m => m.match(path)) && !negativePatterns.some(m => !m.match(path));
}
