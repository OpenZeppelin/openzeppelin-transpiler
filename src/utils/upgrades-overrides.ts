import { ContractDefinition } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { ASTResolver } from '../ast-resolver';
import { getConstructor } from '../solc/ast-utils';
import { execall } from '../utils/execall';

const errorKinds = [
  'state-variable-assignment',
  'state-variable-immutable',
  'external-library-linking',
  'struct-definition',
  'enum-definition',
  'constructor',
  'delegatecall',
  'selfdestruct',
  'missing-public-upgradeto',
] as const;

type ValidationErrorKind = (typeof errorKinds)[number];

export function hasOverride(
  node: Node,
  override: ValidationErrorKind,
  resolver: ASTResolver,
): boolean {
  const overrides = getOverrides(node, resolver);
  return (
    overrides.includes(override) ||
    (override === 'state-variable-assignment' &&
      node.nodeType === 'VariableDeclaration' &&
      node.mutability === 'immutable' &&
      overrides.includes('state-variable-immutable'))
  );
}

export function getOverrides(node: Node, resolver: ASTResolver): ValidationErrorKind[] {
  const overrides = getOwnOverrides(node);
  if ('scope' in node) {
    const contract = resolver.resolveContract(node.scope);
    if (contract) {
      overrides.push(...getOwnOverrides(contract));
    }
  }
  return overrides;
}

function getOwnOverrides(node: Node): ValidationErrorKind[] {
  if ('documentation' in node) {
    const doc =
      typeof node.documentation === 'string' ? node.documentation : node.documentation?.text ?? '';

    const result: string[] = [];
    for (const { groups } of execall(
      /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s@\w+)[^])*)/m,
      doc,
    )) {
      if (groups && groups.title === 'custom' && groups.tag === 'oz-upgrades-unsafe-allow') {
        result.push(...groups.args.split(/\s+/));
      }
    }

    result.forEach(arg => {
      if (!(errorKinds as readonly string[]).includes(arg)) {
        throw new Error(`NatSpec: oz-upgrades-unsafe-allow argument not recognized: ${arg}`);
      }
    });

    return result as ValidationErrorKind[];
  } else {
    return [];
  }
}

export function hasConstructorOverride(contract: ContractDefinition): boolean {
  const ctor = getConstructor(contract);
  return ctor
    ? [...getOwnOverrides(ctor), ...getOwnOverrides(contract)].includes('constructor')
    : false;
}
