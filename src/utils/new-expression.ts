import { Expression } from "solidity-ast";
import { TransformHelper } from "../transformations/type";

export function parseNewExpression(expr: Expression) {
  let needsCast = false;

  if (expr.nodeType === 'FunctionCall' && expr.kind === 'typeConversion') {
    if (
      expr.expression.nodeType === 'ElementaryTypeNameExpression' &&
      expr.expression.typeName.name === 'address'
    ) {
      expr = expr.arguments[0];
      needsCast = true;
    }
  }

  if (
    expr.nodeType === 'FunctionCall' &&
    expr.expression.nodeType === 'NewExpression'
  ) {
    const functionCall = expr;
    const { arguments: args } = expr;
    const { typeName } = expr.expression;

    if (typeName.nodeType !== 'UserDefinedTypeName') {
      return undefined;
    }

    const initializeCall = (varName: string, helper: TransformHelper) => [
      ...(needsCast
        ? [helper.read(typeName), '(', varName, ')']
        : varName),
      '.initialize',
      '(',
      functionCall.arguments.map(a => helper.read(a)).join(', '),
      ')',
    ].join('');

    const newCall = (helper: TransformHelper) => {
      const n = `new ${helper.read(typeName)}()`;
      return needsCast ? `address(${n})` : n;
    }

    return { typeName, args, initializeCall, newCall };
  }
}
