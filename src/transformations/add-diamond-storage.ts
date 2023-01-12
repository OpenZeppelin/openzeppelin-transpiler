import {SourceUnit, ContractDefinition, VariableDeclaration, UserDefinedTypeName, IdentifierPath} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import {Transformation, TransformHelper} from './type';
import { TransformerTools } from '../transform';
import path from 'path';
import {hasOverride} from "../utils/upgrades-overrides";
import {OutputFile} from "../index";
import {getContractsImportPath, renameContract, renamePath} from "../rename";
import {newFunctionPosition} from "./utils/new-function-position";
import {Node} from "solidity-ast/node";
import {
  addVariableScopedContract,
  getScopedContractsForVariables,
  getUniqueIdentifierVarsUsed,
  IdentifierVariable,
} from "./utils/get-identifiers-used";

function* findUserDefinedTypes(node: Node): Generator<UserDefinedTypeName> {
  const seen = new Set();
  for (const id of findAll(['UserDefinedTypeName'], node)) {
    if ('pathNode' in id && id.pathNode !== undefined && !seen.has(id)) {
      seen.add(id.pathNode);
      yield id;
    }
  }
}

export function addDiamondStorage(newFiles: OutputFile[]) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    const { resolver } = tools;

    const contracts = [...findAll('ContractDefinition', sourceUnit)];
    if (!contracts.some(c => c.contractKind === 'contract')) {
      return;
    }

    let buffer = '';
    let contractNeedsStorage = false;
    const contractScopes = new Map<number, string>();
    const contractPaths = new Map<string, Set<string>>();
    const thisContractSet = new Set<string>();
    contractPaths.set(sourceUnit.absolutePath, thisContractSet);

    for (const contract of contracts) {

      const varDecls = [...findAll('VariableDeclaration', contract)];
      const variableNodes = varDecls.filter(
        v => v.stateVariable && !v.constant &&
            !hasOverride(v, 'state-variable-assignment') &&
            !hasOverride(v, 'state-variable-immutable'),
      );

      if ((contract.contractKind === 'contract') && (variableNodes.length > 0)) {

        contractNeedsStorage = true;

        if (!thisContractSet.has(contract.name)) {
          thisContractSet.add(contract.name);
        }

        // move comments for each variable to this map
        const commentMap = new Map();
        for (const varNode of variableNodes) {

          addVariableScopedContract(contractPaths, varNode, tools.resolver);

          const vBounds = getNodeBounds(varNode);
          // grab first line of contract.
          const cStart = newFunctionPosition(contract, tools);

          const contractCode = tools.originalSource;
          const subContractCode = contractCode.substring(cStart, vBounds.start);
          const commentSplit = extractComments(subContractCode);

          let newSource = commentSplit[1].replace('/**', '/*')
          newSource = newSource.replace(/[\t ]+$/, '');
          commentMap.set(varNode.id, newSource);

          yield {
            start: vBounds.start - commentSplit[1].length,
            length: commentSplit[1].length,
            kind: 'remove-var-states-comments',
            text: '',
          };


        }

        const referencedTypeDeclarations: Map<number, IdentifierVariable> = getUniqueIdentifierVarsUsed(contract, tools);
        for (const [_, identifierVar] of referencedTypeDeclarations) {
          const { varDecl } = identifierVar;
          const nodeInfo = resolver.resolveScope(varDecl.scope)!;
          if (nodeInfo.scopeNode && (nodeInfo.scopeNode.id !== sourceUnit.id)) {
            addVariableScopedContract(contractPaths, varDecl, tools.resolver);
          }
        }

        buffer = makeStorageLib(contract.name, variableNodes, commentMap, buffer);
      }
    }


    if (contractNeedsStorage) {

      const newBuffer = `// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

${ getContractsImportPath(contractPaths, path.parse(sourceUnit.absolutePath).dir) }
${ buffer }
`;

      const {dir, name, ext} = path.parse(sourceUnit.absolutePath);
      const newpath = path.format({dir, ext, name: name + 'Storage'});
      newFiles.push({source: newBuffer, fileName: name + 'Storage', path: newpath});
    }
  };
}

function extractComments(source: string) : string[] {
  enum CommentType {
    none,
    doubleSlash,
    slashAsterisk
  }

  const whiteSpace: string = '\t \n';

  let lastNonCommentIndex = -1;
  let commentType = CommentType.none;
  let sLen = source.length;
  for (let i = 0; i < sLen; i++) {
    // not currently processing comment
    if (commentType === CommentType.none) {
      // need to look ahead for comment start
      if (i < sLen - 1) {
        if ((source[i] === '/') && (source[i + 1] === '/')) {
          commentType = CommentType.doubleSlash;
        } else if ((source[i] === '/') && (source[i + 1] === '*')) {
          commentType = CommentType.slashAsterisk;
        }
      }
    } else {
      if ((commentType === CommentType.slashAsterisk)) {
        if ((source[i - 1] === '*') && (source[i] === '/')) {
          commentType = CommentType.none;
          continue;
        }
      } else if (commentType === CommentType.doubleSlash) {
        if (source[i] === '\n') {
          commentType = CommentType.none;
          continue;
        }
      }
    }

    if ((commentType === CommentType.none) && !whiteSpace.includes(source[i])) {
      lastNonCommentIndex = i;
    }
  }

  // keep line ending of non-comment character with it
  if ((lastNonCommentIndex < sLen-1) && (source[lastNonCommentIndex + 1] === '\n')) {
    lastNonCommentIndex++;
  }
  return [source.substring(0, lastNonCommentIndex+1), source.substring(lastNonCommentIndex+1)];
}

function makeStorageLib(name: string, variables: VariableDeclaration[], comments: Map<number, string>, buffer: string) {

  buffer += `
library ${name}Storage {

  struct Layout {
${ variables.map(v =>  {
    let typeString  = v.typeDescriptions.typeString || '';
    if (v.typeName?.nodeType === 'UserDefinedTypeName') {
        const varTypeStrings = typeString.split(' ', 2);
        if (varTypeStrings.length == 2) {
          typeString = renamePath(varTypeStrings[1]);
        }
    }
    
    typeString = filterIdentifierPaths(typeString);

    return comments.get(v.id) + '    ' + typeString + ' ' + v.name + ';'  }).join('\n')
  }
  
  }
  
  bytes32 internal constant STORAGE_SLOT = keccak256('openzeppelin.contracts.storage.${name}');

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly {
      l.slot := slot
    }
  }
}
    `;

  return buffer;
}

function renameIdentifierPath(sourceStr: string) : string {
  const matchStrings = sourceStr.split(/^[ \t]*([A-Za-z_][A-Za-z0-9_.]*)/, 3);
  let retString = matchStrings[1];
  retString = renamePath(retString);
  if (matchStrings.length > 2) {
    retString += matchStrings[2];
  }
  return retString;
}

// Filter the identifier paths (remove 'struct ', 'enum ' and append
function filterIdentifierPaths(sourceStr: string) : string {
  let splitStrings = sourceStr.split(/(enum |struct |contract )/s);
  let retString = splitStrings[0];

  for (let i=2; i < splitStrings.length; i += 2) {
    retString += renameIdentifierPath(splitStrings[i]);
  }

  return retString;

}
