import {SourceUnit, ContractDefinition, VariableDeclaration, UserDefinedTypeName, IdentifierPath} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import path from 'path';
import {hasOverride} from "../utils/upgrades-overrides";
import {OutputFile} from "../index";
import {renameContract, renamePath} from "../rename";
import {newFunctionPosition} from "./utils/new-function-position";
import {Node} from "solidity-ast/node";
import {CONNREFUSED} from "dns";

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
        const start = newFunctionPosition(contract, tools, true);

        const text = '\n' + formatLines(1, [`using ${contract.name}Storage for ${contract.name}Storage.Layout;`]);

        yield {
          kind: 'add-diamond-storage',
          start,
          length: 0,
          text,
        };

        buffer = makeStorageFile(contract.name, variableNodes, buffer);
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

function makeStorageFile(name: string, variables: VariableDeclaration[], buffer: string) {

  buffer += `

library ${name}Storage {

  struct Layout {
  
${ variables.map(v => formatLines(1, [ v.documentation?.text || '' + 
    (v.typeDescriptions.typeString?.startsWith('contract ') ? renameContract(v.typeDescriptions.typeString.substring(9)) 
          : v.typeDescriptions.typeString) + ' ' + v.name + ';' ])).join('') }
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