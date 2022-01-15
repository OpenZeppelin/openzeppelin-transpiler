import {SourceUnit, ContractDefinition, VariableDeclaration} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { formatLines } from './utils/format-lines';
import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';
import path from 'path';
import {hasOverride} from "../utils/upgrades-overrides";
import {OutputFile} from "../index";
import {renameContract} from "../rename";
import {newFunctionPosition} from "./utils/new-function-position";

export function addDiamondStorage(newFiles: OutputFile[]) {
  return function* (sourceUnit: SourceUnit, tools: TransformerTools): Generator<Transformation> {
    const contracts = [...findAll('ContractDefinition', sourceUnit)];
    if (!contracts.some(c => c.contractKind === 'contract')) {
      return;
    }

    let buffer = '';
    let contractNeedsStorage = false;
    for (const contract of contracts) {

      const variableNodes = [...findAll('VariableDeclaration', contract)].filter(
          v =>
              v.stateVariable && !v.constant && !hasOverride(v, 'state-variable-assignment'),
      );

      if ((contract.contractKind === 'contract') && (variableNodes.length > 0)) {

        contractNeedsStorage = true;
        const start = newFunctionPosition(contract, tools, true);

        const text = '\n' + formatLines(1, [`using ${contract.name}Storage as ${contract.name}Storage.Layout;`]);

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
      // create new diamond storage file next to contract(s) file
      const {dir, name, ext} = path.parse(sourceUnit.absolutePath);
      const newpath = path.format({dir, ext, name: name + 'Storage'});
      newFiles.push({source: buffer, fileName: name + 'Storage', path: newpath});
    }
  }
}

function makeStorageFile(name: string, variables: VariableDeclaration[], buffer: string) {

  buffer += `

library ${name}Storage {

  struct Layout {
  
  ${ variables.map(v => `\t${v.typeDescriptions.typeString} ${v.name};`).join('\n') }
  
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