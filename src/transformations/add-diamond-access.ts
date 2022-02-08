import {ContractDefinition, SourceUnit} from 'solidity-ast';
import { findAll } from 'solidity-ast/utils';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation, TransformHelper } from './type';
import { TransformerTools } from '../transform';
import { hasConstructorOverride, hasOverride } from "../utils/upgrades-overrides";
import { Node } from "solidity-ast/node";
import { relativePath } from "../utils/relative-path";
import path from "path";
import {
    getNodeCount,
    getScopedContractName,
    getScopedContractsForVariables,
    getUniqueIdentifierVarsUsed
} from './utils/get-identifiers-used';
import {getContractsImportPath, renameContract, renamePath} from "../rename";

export function* addDiamondAccess(sourceUnit: SourceUnit,
                   tools: TransformerTools,
  ): Generator<Transformation>  {

    const { resolver } = tools;

    const contractScopes = new Map<number, string>();
    const contractPaths = new Map<string, Set<string>>();
    const suContractNameSet = new Set<string>();
    const { dir, name, ext } = path.parse(sourceUnit.absolutePath);
    const suContractPath = `${dir}/${name}Storage${ext}`;
    for (const contractNode of findAll('ContractDefinition', sourceUnit)) {

        if (getNodeCount('VariableDeclaration', contractNode, (node) => {
                return node.stateVariable && !node.constant &&
                    !hasOverride(node, 'state-variable-assignment') &&
                    !hasOverride(node, 'state-variable-immutable');
                } ) > 0) {
            if (!contractPaths.has(suContractPath)) {
                contractPaths.set(suContractPath, suContractNameSet);
            }
            suContractNameSet.add(contractNode.name + 'Storage');
        }

        for (const [_, identifierVar] of getUniqueIdentifierVarsUsed(contractNode, tools)) {
            const { identifier, varDecl } = identifierVar;
            const scopedContractName = getScopedContractName(varDecl.scope, contractPaths, contractScopes, tools);
            const storageLayoutAccess = scopedContractName + '.layout().';
            const idBounds = getNodeBounds(identifier);

            yield {
                start: idBounds.start,
                length: idBounds.length,
                kind: 'set-storage-access-var-inits',
                transform: source => storageLayoutAccess + source,
            };
        }
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

    const importsText = getContractsImportPath(contractPaths, '');

    yield {
        start,
        length: 0,
        kind: 'append-storage-imports',
        text: importsText,
    };

}
