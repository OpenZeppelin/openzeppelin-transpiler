import { ContractDefinition, VariableDeclaration} from 'solidity-ast';
import { TransformerTools } from "../../transform";

export function getVarStorageName(varDecl: VariableDeclaration, { resolver }: TransformerTools) : string {
    const contract = resolver.resolveContract(varDecl.scope);

    let storageName = '';
    if (contract !== undefined) {
        storageName = contract.name + 'Storage.layout().';
    }

    return storageName;

}