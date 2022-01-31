

// get the unique referenced contract definitions
import {ContractDefinition, SourceUnit} from "solidity-ast";
import {getScopedContractsForVariables} from "./get-identifiers-used";
import {TransformerTools} from "../../transform";
import path from "path";
import {isRenamed} from "../../rename";

export function getReferencedImports(contracts: ContractDefinition[], tools: TransformerTools,
                                     suffix: string, initName: string) : Map<string, Array<string>> {
    const { resolver } = tools;

    let referencedContracts = new Map<number, ContractDefinition>();
    for (const contract of contracts) {
        // merge into one map for this SourceUnit
        referencedContracts = new Map<number, ContractDefinition>(
            [...referencedContracts, ...getScopedContractsForVariables(contract, tools)]);
    }

    let imports = new Map<string, Array<string>>();
    referencedContracts.forEach(contract => {
        try {
            const _suffix = ((contract.name === initName) || isRenamed(contract.name)) ? '' : suffix;
            const srcFile: SourceUnit = resolver.resolveNode('SourceUnit', contract.scope)!;
            const { dir, name, ext } = path.parse(srcFile.absolutePath);
            const upgradedPath = dir + path.sep + name + _suffix + ext;

            if (!imports.has(upgradedPath)) {
                imports.set(upgradedPath, new Array<string>());
            }
            const contractDefs = imports.get(upgradedPath)!;
            contractDefs.push(contract.name + _suffix);
        } catch (e) {
            console.log(`Error finding source unit for contract\n${e}`);
        }
    });
    return imports;
}
