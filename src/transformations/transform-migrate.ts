import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

import { Transformation } from './type';
import { isStorageVariable } from './utils/is-storage-variable';

export function* transformMigrate(
  sourceUnit: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    for (const fnDecl of findAll('FunctionDefinition', contract)) {
      if (fnDecl.name.endsWith('_migrate') && fnDecl.implemented) {
        // If the function is implemented, then there is an opening bracket that we can hook to.
        yield {
          ...getNodeBounds(fnDecl),
          kind: 'add-onlyinitializer-modifier',
          transform: source => source.replace(/{/s, 'onlyInitializer {'),
        };
      }
    }
  }
}
