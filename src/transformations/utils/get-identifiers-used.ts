import {ContractDefinition, Identifier, VariableDeclaration} from "solidity-ast";
import { TransformerTools } from "../../transform";
import { ASTResolverError } from "../../ast-resolver";
import { findAllIdentifiers } from "./find-all-identifiers";
import {Node} from "solidity-ast/node";
import {findAll} from "solidity-ast/utils";
import {hasOverride} from "../../utils/upgrades-overrides";

export interface IdentifierVariable {
    identifier: Identifier,
    varDecl: VariableDeclaration,
}

export function getUniqueIdentifierVarsUsed(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, IdentifierVariable> {
    const { resolver } = tools;
    const identifiers  = new Map<number, IdentifierVariable>();

    for (const identifier of findAll('Identifier', contractNode) ) {
        const { id, referencedDeclaration } = identifier;
        if (referencedDeclaration && !identifiers.has(id)) {
            const varDecl: VariableDeclaration = resolver.resolveNode('VariableDeclaration', referencedDeclaration, false)!;
            if (varDecl &&!varDecl.constant && varDecl.stateVariable) {
                identifiers.set(id, { identifier, varDecl});
            }
        }
    }

    return identifiers;
}

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
            if (id && !varDecls.has(id)) {
                const varDecl = resolver.resolveNode('VariableDeclaration', id, false)!;
                if (varDecl && !varDecl.constant && varDecl.stateVariable && !varDecls.has(id)) {
                    varDecls.set(id, varDecl);
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
 * get the contracts definitions for state variables that are being used/referenced in storage
 * @param contractNode - the contractNode you want to evaluate
 * @param tools
 */
export function getScopedContractsForVariables(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, ContractDefinition> {
    const { resolver } = tools;
    const varDecls = getUniqueVariablesUsed(contractNode, tools);
    const contractDefinitions = new Map<number, ContractDefinition>();
    varDecls.forEach( (varDecl, id) => {
        if (varDecl.stateVariable && !varDecl.constant &&
            !hasOverride(varDecl, 'state-variable-assignment') &&
            !hasOverride(varDecl, 'state-variable-immutable')) {
            const varContractNode = resolver.resolveContract(varDecl.scope);
            if ((varContractNode !== undefined) && (!contractDefinitions.has(varContractNode.id))) {
                contractDefinitions.set(varContractNode.id, varContractNode);
            }
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