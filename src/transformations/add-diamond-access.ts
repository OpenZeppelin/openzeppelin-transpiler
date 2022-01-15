import { SourceUnit } from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import {Transformation, TransformHelper} from './type';
import { TransformerTools } from '../transform';
import {hasConstructorOverride, hasOverride} from "../utils/upgrades-overrides";
import {Node} from "solidity-ast/node";
import {relativePath} from "../utils/relative-path";
import path from "path";

 export function* addDiamondAccess(sourceUnit: SourceUnit,
                   tools: TransformerTools,
  ): Generator<Transformation>  {
      const contracts = [...findAll('ContractDefinition', sourceUnit)];
      if (!contracts.some(c => c.contractKind === 'contract')) {
      return;
      }

     let last: Node | undefined;
      for (const node of findAll('PragmaDirective', sourceUnit)) {
          last = node;
      }
      for (const node of findAll('ImportDirective', sourceUnit)) {
          last = node;
      }

      const after = last ? getNodeBounds(last) : {start: 0, length: 0};
      const start = after.start + after.length;
      const { dir, name, ext } = path.parse(sourceUnit.absolutePath);
      const storageFileName = dir + path.sep + name + 'Storage.sol'

      let contractNames = '';
      let needsContractStorageImport = false;
      for (const contract of contracts) {
          const variableNodes = [...findAll('VariableDeclaration', contract)].filter(
              v =>
                  v.stateVariable && !v.constant && !hasOverride(v, 'state-variable-assignment'),
          );
          if (variableNodes.length > 0) {
              needsContractStorageImport = true;
              contractNames += contract.name + ' ';
          }
      }

      if (!needsContractStorageImport) {
          return;
      }


      yield {
          start,
          length: 0,
          kind: 'append-storage-imports',
          text: '\nimport {' +  contractNames + '} from "' + storageFileName + '";'
      };

/*    const {resolver, getData} = tools;
    for (const contractNode of findAll('ContractDefinition', sourceUnit)) {

      for (const expressions of findAll('ExpressionStatement', contractNode)) {
        if (expressions..stateVariable && !varDecl.constant) {
          if (hasOverride(varDecl, 'state-variable-assignment')) {
            continue;
          }

          yield {
            ...getNodeBounds(varDecl),
            kind: 'purge-var-inits',
            transform: source => source.replace(/\s*=.*//*s, ''),
          };
        }
      }
    }
    */
 }

