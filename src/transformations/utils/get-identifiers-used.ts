import {
    ContractDefinition,
    Identifier,
    Mapping,
    TypeName,
    UserDefinedTypeName,
    VariableDeclaration
} from "solidity-ast";
import { TransformerTools } from "../../transform";
import {findAll} from "solidity-ast/utils";
import {hasOverride} from "../../utils/upgrades-overrides";
import path from "path";
import {renameContract, renamePath} from "../../rename";
import assert from "assert";
import {ASTResolver} from "../../ast-resolver";
import { NodeType, NodeTypeMap } from "solidity-ast/node";

export interface IdentifierVariable {
    identifier: Identifier,
    varDecl: VariableDeclaration,
}

export function getUniqueIdentifierVarsUsed(contractNode: ContractDefinition, tools: TransformerTools) : Map<number, IdentifierVariable> {
    const { resolver } = tools;
    const identifiers  = new Map<number, IdentifierVariable>();

    const identifierNodes = findAll('Identifier', contractNode);
    for (const identifier of identifierNodes) {
        const { id, referencedDeclaration } = identifier;
        if (referencedDeclaration && !identifiers.has(id)) {
            const varDecl: VariableDeclaration = resolver.resolveNode('VariableDeclaration', referencedDeclaration, false)!;
            if (varDecl && !varDecl.constant && varDecl.stateVariable &&
                !hasOverride(varDecl, 'state-variable-assignment') &&
                !hasOverride(varDecl, 'state-variable-immutable')) {
                    identifiers.set(id, { identifier, varDecl});
            }
        }
    }

    return identifiers;
}

function addScopedContract(referenceScopes: Map<string, Set<string>>, id: number, resolver: ASTResolver)
{
    const nodeInfo = resolver.resolveScope(id);
    if (nodeInfo) {
        let contract = undefined;
        if (nodeInfo.node?.nodeType === 'ContractDefinition') {
            contract = nodeInfo.node as ContractDefinition;
        } else if (nodeInfo.scopeNode?.nodeType === 'ContractDefinition') {
            contract = nodeInfo.scopeNode as ContractDefinition;
        }
        if (contract) {
            if (!referenceScopes.has(nodeInfo.path)) {
                referenceScopes.set(nodeInfo.path, new Set<string>());
            }
            const contractNamesSet = referenceScopes.get(nodeInfo.path)!;
            contractNamesSet.add(contract.name);
        }
    }
}

function addScopedContractTypeNames(referenceScopes: Map<string, Set<string>>, typeName: TypeName, resolver: ASTResolver){
    switch (typeName.nodeType) {
        case 'UserDefinedTypeName':
            addScopedContract(referenceScopes, typeName.referencedDeclaration, resolver);
            break;
        case 'ArrayTypeName':
            addScopedContractTypeNames(referenceScopes, typeName.baseType, resolver);
            break;
        case 'FunctionTypeName':
            addScopedContract(referenceScopes, typeName.id, resolver);
            typeName.parameterTypes.parameters.forEach( varDecl => { addVariableScopedContract(referenceScopes, varDecl, resolver); });
            typeName.returnParameterTypes.parameters.forEach( varDecl => { addVariableScopedContract(referenceScopes, varDecl, resolver); });
            break;
        case 'Mapping':
            addScopedContractTypeNames(referenceScopes, typeName.keyType,  resolver);
            addScopedContractTypeNames(referenceScopes, typeName.valueType, resolver);
            break;
        case 'ElementaryTypeName':
            break;
    }

}

export function addVariableScopedContract(referenceScopes: Map<string, Set<string>>, varDecl: VariableDeclaration, resolver: ASTResolver) {
    addScopedContract(referenceScopes, varDecl.scope, resolver);
    if (varDecl.typeName) {
        addScopedContractTypeNames(referenceScopes, varDecl.typeName, resolver);
    }
}
/**
 * Get a set/map of unique types that are being referenced in the contract
 * @param contractNode
 * @param tools
 */
export function getScopedContractsForVariables(contract: ContractDefinition, tools: TransformerTools) : Map<string, Set<string>>  {
     const { resolver } = tools;
     const referenceScopes = new Map<string, Set<string>>();

     for (const [_, idVar] of getUniqueIdentifierVarsUsed(contract, tools)) {
         addScopedContract(referenceScopes, idVar.varDecl.id, resolver);
     }

    return referenceScopes;
}

 export function getScopedContractName(
     scope: number,
     contractPaths: Map<string, Set<string>>,
     contractScopes: Map<number, string>,
     tools: TransformerTools, suffix = 'Storage') : string {
    const { resolver } = tools;
     let contractName = contractScopes.get(scope);
     if (!contractName) {
         const nodeInfo = resolver.resolveScope(scope);
         assert(nodeInfo, `Unable to find scope for id: ${scope}`);
         const { dir, name, ext} = path.parse(nodeInfo.path);
         const contractPath = `${dir}/${name}${suffix}${ext}`;
         if (nodeInfo.node.nodeType === 'ContractDefinition') {
             contractName = nodeInfo.node.name + suffix;
             contractScopes.set(scope, contractName);
             if (!contractPaths.has(contractPath)) {
                 contractPaths.set(contractPath, new Set<string>());
             }
             const contractSet = contractPaths.get(contractPath)!;
             if (!contractSet.has(contractName)) {
                 contractSet.add(contractName);
             }
         } else {
             contractName = '';
         }
     }

     return contractName;
 }

 export function getNodeCount<T extends NodeType>(nodeTypes: T | T[], contract: ContractDefinition, filter?:(node: NodeTypeMap[T]) => any ) : number {
    if (!Array.isArray(nodeTypes)) {
        nodeTypes = [nodeTypes];
    }

    let count = 0;

    contract.nodes.forEach( node => {
        const newNode = node as NodeTypeMap[T];
        if ((nodeTypes.indexOf(newNode.nodeType as T) > -1 ) && (!filter || filter(newNode))) {
            count++;
        }
     });

    return count;

 }

