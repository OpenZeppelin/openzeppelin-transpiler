//
//
// // get the unique referenced contract definitions
// import {ContractDefinition, SourceUnit} from "solidity-ast";
// import {getReferencedContractScopes} from "./get-identifiers-used";
// import {TransformerTools} from "../../transform";
// import path from "path";
// import {isRenamed} from "../../rename";
//
// export function getReferencedImports(contracts: ContractDefinition[], tools: TransformerTools,
//                                      initName: string, onlyStorage = false) : Map<string, Set<string>> {
//
//     let referencedContracts = new Map<string, Set<string>>();
//     for (const contract of contracts) {
//         // merge into one map for this SourceUnit
//         referencedContracts = new Map<string,  Set<string>>(
//             [...referencedContracts, ...getReferencedContractScopes(contract, tools)]);
//     }
//
//     let imports = new Map<string, Set<string>>();
//     referencedContracts.forEach( (contractSet, contractPath) => {
//         contractSet.forEach( contractName => {
//         try {
//             const suffix = ((contractName === initName) || (!onlyStorage && isRenamed(contractName)) ? ''
//             const _suffix = ( || () ? '' : suffix;
//             const { dir, name, ext } = path.parse(contractPath);
//             const upgradedPath = dir + path.sep + name + _suffix + ext;
//
//             if (!imports.has(upgradedPath)) {
//                 imports.set(upgradedPath, new Set<string>());
//             }
//             const contractDefs = imports.get(upgradedPath)!;
//             contractDefs.add(contractName + _suffix);
//         } catch (e) {
//             console.log(`Error finding source unit for contract\n${e}`);
//         }
//         });
//     });
//     return imports;
// }
