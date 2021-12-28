import path from 'path';
import { Transform } from './transform';
import { formatLines, Line } from './transformations/utils/format-lines';
import { findAll } from 'solidity-ast/utils';
import { getConstructor } from './solc/ast-utils';
import { renameContract, renamePath } from './rename';
import { relativePath } from './utils/relative-path';
import { hasConstructorOverride } from './utils/upgrades-overrides';

export function generateWithInit(transform: Transform, destPath: string): string {
  const res: Line[] = [`pragma solidity >=0.6 <0.9;`, `pragma experimental ABIEncoderV2;`, ``];

  for (const sourceUnit of transform.asts()) {
    for (const contract of findAll('ContractDefinition', sourceUnit)) {
      if (
        contract.contractKind !== 'contract' ||
        contract.abstract ||
        hasConstructorOverride(contract)
      ) {
        continue;
      }

      const constructorNode = getConstructor(contract);

      let argNames = '';
      if (constructorNode) {
        argNames = constructorNode.parameters.parameters.map(p => p.name).join(', ');
      }

      let argsList = '';

      if (constructorNode) {
        const source = transform.read(constructorNode);
        const argsMatch = source.match(/\((.*?)\)/s);
        if (argsMatch === null) {
          throw new Error(`Could not find constructor arguments for ${contract.name}`);
        }
        [, argsList] = argsMatch;
      }

      const renamedContract = renameContract(contract.name);

      res.push(
        `import "${relativePath(path.dirname(destPath), renamePath(sourceUnit.absolutePath))}";`,
        ``,
        `contract ${renamedContract}WithInit is ${renamedContract} {`,
        [
          `constructor(${argsList}) public payable initializer {`,
          [`__${contract.name}_init(${argNames});`],
          `}`,
        ],
        `}`,
      );
    }
  }

  return formatLines(0, res);
}
