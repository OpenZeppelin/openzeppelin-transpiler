import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import { getNodeBounds } from '../solc/ast-utils';
import { TransformerTools } from '../transform';

import { Transformation } from './type';
import { extractNatspec } from '../utils/natspec';

export function* addModifiers(
  sourceUnit: SourceUnit,
  { resolver }: TransformerTools,
): Generator<Transformation> {
  for (const contract of findAll('ContractDefinition', sourceUnit)) {
    for (const fnDecl of findAll('FunctionDefinition', contract)) {
      for (const entry of extractNatspec(fnDecl)) {
        if (entry.title === 'custom' && entry.tag === 'add-modifier' && entry.args !== "") {
          yield {
            ...getNodeBounds(fnDecl),
            kind: 'add-onlyinitializer-modifier',
            transform: source => source.replace(/{/s, `${entry.args.trim()} {`),
          };
        }
      }
    }
  }
}
