import {Node} from "solidity-ast/node";
import {findAll} from "solidity-ast/utils";

export function* findAllIdentifiers(node: Node) {
    const seen = new Set();
    for (const id of findAll(['UserDefinedTypeName', 'IdentifierPath', 'Identifier'], node)) {
        if ('pathNode' in id && id.pathNode !== undefined) {
            seen.add(id.pathNode);
        }
        if (!seen.has(id)) {
            yield id;
        }
    }
}