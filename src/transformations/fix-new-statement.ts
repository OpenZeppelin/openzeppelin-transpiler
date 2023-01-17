import { ContractDefinition, Expression, ExpressionStatement,
    FunctionCall, NewExpression, SourceUnit, TypeName, VariableDeclarationStatement, Assignment, VariableDeclaration, UserDefinedTypeName } from 'solidity-ast';
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
// Variable declarations are supported.
export function* fixNewStatement(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {
    const {resolver, getData } = tools;

    for (const statement of findAll(['ExpressionStatement', 'VariableDeclarationStatement'], sourceUnit)!) {
        let rightExpression: Expression | undefined;
        let leftExpression: Expression | undefined;
        let leftAssignment = '';
        if (statement.nodeType === 'ExpressionStatement') {
            const {expression} = statement;
            if (expression.nodeType === 'Assignment') {
                rightExpression = expression.rightHandSide;
                leftExpression = expression.leftHandSide;
            }
        } else if (statement.nodeType === 'VariableDeclarationStatement') {
            rightExpression = statement.initialValue || undefined;
            // get right most variable that was assigned in the VariableDeclarationStatement
            leftAssignment = statement.declarations[statement.declarations.length-1]?.name || '';
        }

        if (rightExpression &&
            rightExpression.nodeType === 'FunctionCall' &&
            rightExpression.expression.nodeType === 'NewExpression'
        ) {
            const {typeName} = rightExpression.expression;

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
                                leftExpression ? helper.read(leftExpression) : leftAssignment,
                                '.initialize',
                                '(',
                                (rightExpression as FunctionCall).arguments.map(a => helper.read(a)).join(', '),
                                ')',
                            ].join(''),
                    };

                    if (rightExpression.arguments.length > 0) {
                        const {start} = getNodeBounds(rightExpression.arguments[0]);
                        const [lastArg] = rightExpression.arguments.slice(-1);
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
