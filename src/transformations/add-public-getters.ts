import {ElementaryTypeName, SourceUnit, TypeName, UserDefinedTypeName, VariableDeclaration } from 'solidity-ast';

import { getConstructor, getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { buildSuperCallsForChain2 } from './utils/build-super-calls-for-chain';
import { findAll } from 'solidity-ast/utils';
import { TransformerTools } from '../transform';
import { newFunctionPosition } from './utils/new-function-position';
import { formatLines } from './utils/format-lines';
import { hasConstructorOverride, hasOverride } from '../utils/upgrades-overrides';
import { getVarStorageName } from './utils/get-var-storage-name';
import { renameContract, renamePath } from '../rename';
import { Node } from 'solidity-ast/node';
import path from 'path';

export function* addPublicGetters(
  sourceUnit: SourceUnit,
  tools: TransformerTools,
): Generator<Transformation> {

  const { resolver } = tools;

  for (const contractNode of findAll('ContractDefinition', sourceUnit)) {
    if (contractNode.contractKind !== 'contract') {
      continue;
    }

    const {name} = contractNode;

    const publicVariables = [...findAll('VariableDeclaration', contractNode)].filter(
        v =>
            v.stateVariable && (v.visibility === "public") &&
            !v.constant &&
            !hasOverride(v, 'state-variable-assignment') &&
            v.functionSelector,
    );

    if (publicVariables.length > 0) {

      let getterFuncsText = '';

      for (const varDecl of publicVariables) {

        const argumentsText: string[] = [];
        // VariableDeclaration nodes for function parameters or state variables will always
        // have their typeName fields defined.
        let nextType = varDecl.typeName!;
        let returnType;
        while (true) {
          if (nextType.nodeType === "Mapping") {
            const canonicalType = canonicalAbiTypeForElementaryOrUserDefinedTypes(
                nextType.keyType
            )!;
            argumentsText.push(`${canonicalType} arg${argumentsText.length.toString()}`);

            nextType = nextType.valueType;
          } else {
            if (nextType.nodeType === "ArrayTypeName") {
              argumentsText.push(`uint256 arg${argumentsText.length.toString()}`);
              nextType = nextType.baseType;
            }

            if (nextType.nodeType === 'UserDefinedTypeName') {
              const userVarDecl = resolver.resolveScope(nextType.referencedDeclaration)!.node;
              returnType = nextType.pathNode!.name;
              if (['ArrayDefinition','StructDefinition'].indexOf(userVarDecl.nodeType) > -1) {
                if (('scope' in userVarDecl) && (userVarDecl.scope !== contractNode.id)) {
                  returnType = renamePath(returnType);
                }
                returnType += ' memory';
              } else if (userVarDecl.nodeType === 'ContractDefinition') {
                returnType = renameContract(returnType);
              }
            } else {
              returnType = canonicalAbiTypeForElementaryOrUserDefinedTypes(
                  nextType
              );
              if (returnType === 'string') {
                returnType += ' memory';
              }
            }
            break;
          }
        }

        const arrayAccess = argumentsText.map((arg, index) => `[arg${index.toString()}]`).join('');
        getterFuncsText += '\n' +
          '    // generated getter for ${varDecl.name}\n' +
          `    function ${varDecl.name}(${argumentsText.join(',')}) public view returns(${returnType}) {\n` +
          `        return ${getVarStorageName(varDecl, tools)}${varDecl.name}${arrayAccess};\n` +
          `    }\n`;
      }

      // grab first line of contract.
      const braceOffset = newFunctionPosition(contractNode, tools, true);

      yield {
        start: braceOffset,
        length: 0,
        kind: 'add-public-getters',
        text: getterFuncsText,
      };
    }
  }
}

function isContractType(param: any) {
  return (
      (param.typeName?.nodeType === "UserDefinedTypeName" ||
          param?.nodeType === "UserDefinedTypeName") &&
      param.typeDescriptions?.typeString !== undefined &&
      param.typeDescriptions.typeString.startsWith("contract ")
  );
}

function isEnumType(param: any) {
  return (
      (param.typeName?.nodeType === "UserDefinedTypeName" ||
          param?.nodeType === "UserDefinedTypeName") &&
      param.typeDescriptions?.typeString !== undefined &&
      param.typeDescriptions.typeString.startsWith("enum ")
  );
}

function canonicalAbiTypeForElementaryOrUserDefinedTypes(typeName: TypeName): string | undefined {
  if (typeName.nodeType === "ElementaryTypeName") {
    return toCanonicalAbiType(typeName.name);
  }

  if (isEnumType(typeName)) {
    return renamePathNode(typeName.typeDescriptions?.typeString?.substring(5) || '');
  }

  if (isContractType(typeName)) {
    return renameContract(typeName.typeDescriptions?.typeString?.substring(8) || '');
  }

  return undefined;
}

function toCanonicalAbiType(type: string): string {
  if (type.startsWith("int[")) {
    return `int256${type.slice(3)}`;
  }

  if (type === "int") {
    return "int256";
  }

  if (type.startsWith("uint[")) {
    return `uint256${type.slice(4)}`;
  }

  if (type === "uint") {
    return "uint256";
  }

  if (type.startsWith("fixed[")) {
    return `fixed128x128${type.slice(5)}`;
  }

  if (type === "fixed") {
    return "fixed128x128";
  }

  if (type.startsWith("ufixed[")) {
    return `ufixed128x128${type.slice(6)}`;
  }

  if (type === "ufixed") {
    return "ufixed128x128";
  }

  return type;
}

function renamePathNode(pathNode: string) : string {

  if (pathNode.indexOf('.') > -1) {
    return renamePath(pathNode);
  }

  return pathNode;
}


