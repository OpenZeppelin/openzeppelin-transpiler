import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';

import { Transformation } from './type';
import { extractOptionalInitializer } from '../utils/natspec';

export function* transformOptionalInitializer(
  sourceUnit: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    for (const fnDecl of findAll('FunctionDefinition', contract)) {
      if (extractOptionalInitializer(fnDecl)) {
        if (fnDecl.visibility !== 'internal') {
          throw new Error(`@custom:oz-upgrades-optional-initializer can only be used on internal functions, but found on ${fnDecl.name} in contract ${contract.name}`);
        }
        if (fnDecl.modifiers.some(mod => mod.modifierName.name === 'onlyInitializing')) {
          continue;
        }
        yield {
          ...getNodeBounds(fnDecl),
          kind: 'add-onlyinitializer-modifier',
          transform: source => source.replace(/{/s, `onlyInitializing {`),
        };
      }
    }
  }
}
