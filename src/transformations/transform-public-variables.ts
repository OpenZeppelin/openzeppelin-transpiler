import { SourceUnit } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';

export function* transformPublicVariables(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (contractNode.contractKind !== 'contract') {
      continue;
    }

    const { name } = contractNode;

    const publicVariables = [...findAll('VariableDeclaration', contractNode)].filter(
      v =>
        v.stateVariable && ((v.visibility == "external") || (v.visibility == "public"))  &&
          !v.constant && !hasOverride(v, 'state-variable-assignment'),
    );

    //varInitNodes.map(v => `${v.name} = ${helper.read(v.value!)};`),

    const text = '';
    const { start, length } = getNodeBounds(contractNode)

    yield {
      kind: 'transform-public-variables',
      start: start + length - 1,
      length: 0,
      text,
    };
  }
}
