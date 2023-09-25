import { ContractDefinition, StructuredDocumentation } from 'solidity-ast';
import { execall } from './execall';

interface NatspecTag {
  title: string;
  tag: string;
  args: string;
}

export function* extractNatspec(node: {
  documentation?: string | StructuredDocumentation | null;
}): Generator<NatspecTag> {
  const doc =
    typeof node.documentation === 'string' ? node.documentation : node.documentation?.text ?? '';

  for (const { groups } of execall(
    /^\s*(?:@(?<title>\w+)(?::(?<tag>[a-z][a-z-]*))? )?(?<args>(?:(?!^\s@\w+)[^])*)/m,
    doc,
  )) {
    if (groups) {
      yield {
        title: groups.title ?? '',
        tag: groups.tag ?? '',
        args: groups.args ?? '',
      };
    }
  }
}

export function extractContractStorageSize(contract: ContractDefinition): number | undefined {
  let targetSlots;
  for (const entry of extractNatspec(contract)) {
    if (entry.title === 'custom' && entry.tag === 'storage-size') {
      targetSlots = parseInt(entry.args);
    }
  }
  return targetSlots;
}

export function extractContractNeedNotTranspile(contract: ContractDefinition): string[] {
  const modes = [];
  for (const entry of extractNatspec(contract)) {
    if (entry.title === 'custom' && entry.tag === 'need-not-transpile') {
      modes.push(entry.args);
    }
  }
  return modes;
}
