import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { TransformerTools } from '../transform';
import { hasConstructorOverride, hasOverride } from "../utils/upgrades-overrides";
import { Node } from "solidity-ast/node";
import { relativePath } from "../utils/relative-path";
import path from "path";
import { getScopedContractsForVariables, getUniqueIdentifierVarsUsed } from './utils/get-identifiers-used';
import {ContractsIdentifier} from "hardhat/internal/hardhat-network/stack-traces/contracts-identifier";

export function* addDiamondAccess(sourceUnit: SourceUnit,
                   tools: TransformerTools,
  ): Generator<Transformation>  {

    const { resolver } = tools;

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
    const {dir, name, ext} = path.parse(sourceUnit.absolutePath);
    const storageFileName = dir + path.sep + name + 'Storage.sol'

    // get the unique referenced contract definitions
    let referencedContracts = new Map<number, ContractDefinition>();
    for (const contract of contracts) {
        // merge into one map for this SourceUnit
        referencedContracts = new Map<number, ContractDefinition>(
            [...referencedContracts, ...getScopedContractsForVariables(contract, tools)]);
    }

    let imports = new Map<string, Array<string>>();
    referencedContracts.forEach(contract => {
        try {
            const srcFile: SourceUnit = resolver.resolveNode('SourceUnit', contract.scope)!;
            if (!imports.has(srcFile.absolutePath)) {
                imports.set(srcFile.absolutePath, new Array<string>());
            }
            const contractDefs = imports.get(srcFile.absolutePath)!;
            contractDefs.push(contract.name + 'Storage');
        } catch (e) {

        }
    });

    let importText = '';
    imports.forEach( (contractNames, filePath ) => {
        const { dir, name, ext } = path.parse(filePath);
        const storageFileName = dir + path.sep + name + 'Storage' + ext;
        importText += '\nimport { ' + contractNames.join(', ') + ' } from "' + storageFileName + '";'
    });

    yield {
        start,
        length: 0,
        kind: 'append-storage-imports',
        text: importText,
    };


    const contractNames = new Map<number, string>();
    for (const contractNode of findAll('ContractDefinition', sourceUnit)) {

        if (!contractNames.has(contractNode.id)) {
            contractNames.set(contractNode.id, contractNode.name);
        }

        const identifierVars = getUniqueIdentifierVarsUsed(contractNode, tools);
        for (const [_, identifierVar] of identifierVars) {
            const { identifier, varDecl } = identifierVar;
            if (varDecl.stateVariable &&
                !varDecl.constant &&
                !hasOverride(varDecl, 'state-variable-assignment') &&
                !hasOverride(varDecl, 'state-variable-immutable')) {
                let scopedContractName;
                if (varDecl.scope === contractNode.id) {
                    scopedContractName = contractNode.name;
                } else {
                    scopedContractName = contractNames.get(varDecl.scope);
                    if (!scopedContractName) {
                        const scopedContractNode = resolver.resolveContract(varDecl.scope)!;
                        contractNames.set(scopedContractNode.id, scopedContractNode.name);
                        scopedContractName = scopedContractNode.name;
                    }
                }

                const storageLayoutAccess = scopedContractName + 'Storage.layout().';
                const idBounds = getNodeBounds(identifier);

                yield {
                    start: idBounds.start,
                    length: idBounds.length,
                    kind: 'set-storage-access-var-inits',
                    transform: source => storageLayoutAccess + source,
                };
            }
        }
    }
}
