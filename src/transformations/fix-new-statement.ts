import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import { parseNewExpression } from '../utils/new-expression';

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
      const newExpr = parseNewExpression(expression.rightHandSide);

      if (newExpr) {
        const { typeName, args, initializeCall } = newExpr;
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
                initializeCall(helper.read(expression.leftHandSide), helper),
              ].join(''),
          };

          if (args.length > 0) {
            const { start } = getNodeBounds(args[0]);
            const [lastArg] = args.slice(-1);
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
