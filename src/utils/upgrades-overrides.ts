import { Node } from 'solidity-ast/node';
import { execall } from '../utils/execall';

export function hasImmutableOverride(node: Node): boolean {
  return getOverrides(node).includes('immutable');
}

export function getOverrides(node: Node): string[] {
  if ('documentation' in node) {
    const doc = typeof node.documentation === 'string' ? node.documentation : node.documentation?.text ?? '';

    const result: string[] = [];
    for (const { groups } of execall(
      /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s@\w+)[^])*)/m,
      doc,
    )) {
      if (groups && groups.title === 'custom' && groups.tag === 'oz-upgrades-unsafe-allow') {
        result.push(...groups.args.split(/\s+/));
      }
    }

    return result;
  } else {
    return [];
  }
}
