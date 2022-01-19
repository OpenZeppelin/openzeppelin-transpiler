import { ContractDefinition, VariableDeclaration } from "solidity-ast";
import { TransformerTools } from "../../transform";
import { ASTResolverError } from "../../ast-resolver";
import { findAllIdentifiers } from "./find-all-identifiers";
import {Node} from "solidity-ast/node";
import {findAll} from "solidity-ast/utils";

/*
export function getUniqueIdentifiersUsed(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, VariableDeclaration> {
    const { resolver } = tools;
    const varDecls:  = new Map<number, VariableDeclaration>();

    for (const { referencedDeclaration: id } of findAll('Identifier', contractNode) ) {

        if (id != null) {
            try {
                const varDecl: VariableDeclaration = resolver.resolveNode('VariableDeclaration', id);
                varDecls.set(varDecl);
            } catch (e) {
                console.log('Shouldn\'t be here that\'s for sure!');
            }
        }
    }

    return varDecls;
} */

/**
 * Get a set/map of unique state variables that are being used in the contract
 * @param contractNode
 * @param tools
 */
export function getUniqueVariablesUsed(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, VariableDeclaration> {
    const { resolver } = tools;
    const varDecls = new Map<number, VariableDeclaration>();

    for (const identifier of findAll(['VariableDeclaration', 'Identifier'], contractNode )) {
        if (identifier.nodeType === 'Identifier') {
            const id = identifier.referencedDeclaration;
            try {
                if (id && !varDecls.has(id)) {
                    const varDecl = resolver.resolveNode('VariableDeclaration', id);
                    varDecls.set(id, varDecl);
                }
            } catch (e) {
                if (!(e instanceof ASTResolverError)) {
                    throw e;
                }
            }
        } else {
            const id = identifier.id;
            if (!identifier.constant && identifier.stateVariable && !varDecls.has(id)) {
                varDecls.set(id, identifier);
            }
        }
    }

    return varDecls;
}

/**
 * get the contracts definitions for state variables that are being used/refereenced
 * @param contractNode - the contractNode you want to evaluate
 * @param tools
 */
export function getScopedContractsForVariables(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, ContractDefinition> {
    const { resolver } = tools;
    const varDecls = getUniqueVariablesUsed(contractNode, tools);
    const contractDefinitions = new Map<number, ContractDefinition>();
    varDecls.forEach( (varDecl, id) => {
        const varContractNode = resolver.resolveContract(varDecl.scope);
        if ((varContractNode !== undefined) && (!contractDefinitions.has(varContractNode.id))){
            contractDefinitions.set(varContractNode.id, varContractNode);
        }
    });

    return contractDefinitions;
}

function* findAllIdentifiersAndVariableDeclaration(node: Node) {
    const seen = new Set();
    for (const id of findAll(['VariableDeclaration', 'Identifier'], node)) {
        if (id.nodeType === 'Identifier') {
        }
        if (!seen.has(id.id)) {
            seen.add(id.id)
        }
        if (!seen.has(id)) {
            yield id;
        }
    }
}