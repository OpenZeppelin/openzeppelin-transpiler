import { SourceUnit } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';

import path from 'path';
import { relativePath } from '../utils/relative-path';

import { getNodeBounds } from '../solc/ast-utils';
import { Transformation } from './type';
import { TransformerTools } from '../transform';

export function* appendInitializableImport(
  contractsDir: string,
  sourceUnit: SourceUnit,
  { isExcluded }: TransformerTools,
): Generator<Transformation> {
  const contracts = [...findAll('ContractDefinition', sourceUnit, isExcluded)];
  if (!contracts.some(c => c.contractKind === 'contract')) {
    return;
  }

  let last: Node | undefined;
  for (const node of findAll('PragmaDirective', sourceUnit)) {
    last = node;
  }
  for (const node of findAll('ImportDirective', sourceUnit)) {
    last = node;
  }

  const relativeImportPath = relativePath(
    path.dirname(sourceUnit.absolutePath),
    path.join(contractsDir, 'Initializable.sol'),
  );

  const after = last ? getNodeBounds(last) : { start: 0, length: 0 };
  const start = after.start + after.length;

  yield {
    start,
    length: 0,
    kind: 'append-initializable-import',
    text: `\nimport "${relativeImportPath}";`,
  };
}
