import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';
import minimatch from 'minimatch';

import { newFunctionPosition } from './utils/new-function-position';
import { buildPublicInitialize } from './utils/build-public-initialize';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function addRequiredPublicInitializer(publicInitializers: string[] | undefined) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    const { getData } = tools;

    const requested = publicInitializers?.some(p => minimatch(sourceUnit.absolutePath, p)) ?? false;

    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      if (
        getData(contract).isUsedInNewStatement ||
        (requested && contract.contractKind === 'contract')
      ) {
        const start = newFunctionPosition(contract, tools);

        yield {
          start,
          length: 0,
          kind: 'add-external-initializer',
          text: buildPublicInitialize(contract, tools),
        };
      }
    }
  };
}
