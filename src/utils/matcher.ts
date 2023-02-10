import { Minimatch } from 'minimatch';

export function matcher(patterns: string[]): (path: string) => boolean | undefined {
  const positivePatterns: Minimatch[] = [];
  const negativePatterns: Minimatch[] = [];

  for (const pat of patterns) {
    const m = new Minimatch(pat);
    if (m.negate) {
      negativePatterns.push(m);
    } else {
      positivePatterns.push(m);
    }
  }

  return path => {
    if (negativePatterns.some(m => !m.match(path))) {
      return false;
    } else if (positivePatterns.some(m => m.match(path))) {
      return true;
    } else {
      return undefined;
    }
  };
}
