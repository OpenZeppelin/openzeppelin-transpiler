import {SourceUnit, ContractDefinition, VariableDeclaration, UserDefinedTypeName, IdentifierPath} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import {Transformation, TransformHelper} from './type';
import { TransformerTools } from '../transform';
import path from 'path';
import {hasOverride} from "../utils/upgrades-overrides";
import {OutputFile} from "../index";
import {renameContract, renamePath} from "../rename";
import {newFunctionPosition} from "./utils/new-function-position";
import {Node} from "solidity-ast/node";

function* findAllContractIdentifiers(node: Node) {
  const seen = new Set();
  for (const id of findAll(['UserDefinedTypeName', 'IdentifierPath', 'Identifier'], node)) {
    if ('pathNode' in id && id.pathNode !== undefined && !seen.has(id)) {
      seen.add(id.pathNode);
      yield id;
    }
  }
}

export function addDiamondStorage(newFiles: OutputFile[]) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    const contracts = [...findAll('ContractDefinition', sourceUnit)];
    if (!contracts.some(c => c.contractKind === 'contract')) {
      return;
    }

    let buffer = '';
    let contractNeedsStorage = false;
    const importsNeeded = new Set();
    for (const contract of contracts) {

      const varDecls = [...findAll('VariableDeclaration', contract)];
      const variableNodes = varDecls.filter(
        v => v.stateVariable && !v.constant && !hasOverride(v, 'state-variable-assignment'),
      );

      for (const contractVariable of findAllContractIdentifiers(contract)) {
        const contractPath = tools.resolver.resolveContractPath(contractVariable.referencedDeclaration);
        if (contractPath !== undefined) {
          const newPathName = renamePath(contractPath);
          importsNeeded.add(`\nimport "${newPathName}";`)
        }
      }

      if ((contract.contractKind === 'contract') && (variableNodes.length > 0)) {

        contractNeedsStorage = true;

        // move comments for each variable to this map
        const commentMap = new Map();
        for (const varNode of variableNodes) {
          const vBounds = getNodeBounds(varNode);
          // grab first line of contract.
          const cStart = newFunctionPosition(contract, tools, true);

          const contractCode = tools.originalSource;
          const subContractCode = contractCode.substring(cStart, vBounds.start);
          const commentSplit = extractComments(subContractCode);

          let newSource = commentSplit[1].replace('@dev', '@devnotice');
          newSource = newSource.replace(/^(\t|\n|\r| )+/s, '');
          commentMap.set(varNode.id, newSource);

          yield {
            start: vBounds.start - newSource.length,
            length: newSource.length,
            kind: 'remove-var-states-comments',
            text: '',
          };
        }

        const start = newFunctionPosition(contract, tools, true)-1;

        const text = `{\n    using ${contract.name}Storage for ${contract.name}Storage.Layout;\n`;

        yield {
          kind: 'add-diamond-storage',
          start,
          length: 0,
          text,
        };

        buffer = makeStorageLib(contract.name, variableNodes, commentMap, buffer);
      }
    }

    if (contractNeedsStorage) {
      const newBuffer = `// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
${ [...importsNeeded].join('')}` + buffer;

      const {dir, name, ext} = path.parse(sourceUnit.absolutePath);
      const newpath = path.format({dir, ext, name: name + 'Storage'});
      newFiles.push({source: newBuffer, fileName: name + 'Storage', path: newpath});
    }
  }
}

function extractComments(source: string) : string[] {
  enum CommentType {
    none,
    doubleSlash,
    slashAsterisk
  }
  const whiteSpace : string = '\t\r\n ';

  let lastNonCommentIndex = 0;
  let commentType = CommentType.none;
  let sLen = source.length;
  for (let i=0; i<sLen; i++) {
    // not currently processing comment
    if (commentType === CommentType.none) {
      // need to look ahead for comment start
      if (i < sLen-1) {
        if ((source[i] === '/') && (source[i + 1] === '/')) {
          commentType = CommentType.doubleSlash;
        } else if ((source[i] === '/') && (source[i + 1] === '*')) {
          commentType = CommentType.slashAsterisk;
        }
      }
    } else {
      if ((commentType === CommentType.slashAsterisk)) {
        if ((source[i-1] === '*') && (source[i] === '/')) {
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
      lastNonCommentIndex = i + 1;
    }
  }

  return [source.substring(0, lastNonCommentIndex), source.substring(lastNonCommentIndex)];
}

function makeStorageLib(name: string, variables: VariableDeclaration[], comments: Map<number, string>, buffer: string) {

  buffer += `

library ${name}Storage {

  struct Layout {
${ variables.map(v =>  '    ' + comments.get(v.id)  +
    (v.typeDescriptions.typeString?.startsWith('contract ') ? 
      renameContract(v.typeDescriptions.typeString.substring(9)) 
          : v.typeDescriptions.typeString) + ' ' + v.name + ';' ).join('\n') }
  }
  
  bytes32 internal constant STORAGE_SLOT = keccak256('openzepplin.contracts.storage.${name}');

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