import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { newFunctionPosition } from './utils/new-function-position';
import { buildPublicInitialize } from './utils/build-pulic-initialize';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

declare module '../transform' {
  interface TransformData {
    isUsedInNewStatement: boolean;
  }
}

export function* fixNewStatement(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  const { resolver, getData } = tools;

  for (const statement of findAll('ExpressionStatement', sourceUnit)) {
    const { expression } = statement;

    if (expression.nodeType === 'Assignment') {
      const { rightHandSide } = expression;

      if (
        rightHandSide.nodeType === 'FunctionCall' &&
        rightHandSide.expression.nodeType === 'NewExpression'
      ) {
        const { typeName } = rightHandSide.expression;

        if (typeName.nodeType === 'UserDefinedTypeName') {
          const contract = resolver.resolveContract(typeName.referencedDeclaration);

          if (contract) {
            getData(contract).isUsedInNewStatement = true;

            const stBounds = getNodeBounds(statement);
            const afterStatement = stBounds.start + stBounds.length;

            yield {
              start: afterStatement,
              length: 0,
              kind: 'fix-new-statement',
              transform: (_, helper) =>
                [
                  ';\n',
                  ' '.repeat(4 * 2),
                  helper.read(expression.leftHandSide),
                  '.initialize',
                  '(',
                  rightHandSide.arguments.map(a => helper.read(a)).join(', '),
                  ')',
                ].join(''),
            };

            if (rightHandSide.arguments.length > 0) {
              const { start } = getNodeBounds(rightHandSide.arguments[0]);
              const [lastArg] = rightHandSide.arguments.slice(-1);
              const lastArgBounds = getNodeBounds(lastArg);
              const length = lastArgBounds.start + lastArgBounds.length - start;

              yield {
                start,
                length,
                kind: 'fix-new-statement-remove-args',
                text: '',
              };
            }
          }
        }
      }
    }
  }
}
