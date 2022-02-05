import { TransformerTools } from "../../transform";
import {ContractDefinition, VariableDeclaration} from "solidity-ast";
import assert from "assert";

export function getVarStorageName(varDecl: VariableDeclaration, { resolver }: TransformerTools) : string {
    const contract = resolver.resolveContract(varDecl.scope);

    assert(contract, `Could not locate Contract with id ${varDecl.scope}`);
    return contract.name + 'Storage.layout().';
}