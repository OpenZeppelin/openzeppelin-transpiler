import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

declare module '../transform' {
  interface TransformData {
    isUsedInNewStatement: boolean;
  }
}

// Finds statements of the form:
//   - x = new Foo(...);
//   - x = address(new Foo(...));
// and transforms them to use initializers:
//     x = new Foo();
//     x.initialize(...);
// Note that these are variable assignments.
// Variable declarations are not supported.
export function* fixNewStatement(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
  const { resolver, getData } = tools;

  for (const statement of findAll('ExpressionStatement', sourceUnit)) {
    const { expression } = statement;

    if (expression.nodeType === 'Assignment') {
      let needsCast = false;
      let { rightHandSide } = expression;

      if (rightHandSide.nodeType === 'FunctionCall' && rightHandSide.kind === 'typeConversion') {
        const castTo = rightHandSide.expression;
        if (castTo.nodeType === 'ElementaryTypeNameExpression' && castTo.typeName.name === 'address') {
          rightHandSide = rightHandSide.arguments[0];
          needsCast = true;
        }
      }

      if (
        rightHandSide.nodeType === 'FunctionCall' &&
        rightHandSide.expression.nodeType === 'NewExpression'
      ) {
        const functionCall = rightHandSide;
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
                  ...needsCast
                  ? [ helper.read(typeName), '(', helper.read(expression.leftHandSide), ')', ]
                  : helper.read(expression.leftHandSide),
                  '.initialize',
                  '(',
                  functionCall.arguments.map(a => helper.read(a)).join(', '),
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
