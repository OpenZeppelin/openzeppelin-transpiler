import { SourceUnit } from 'solidity-ast';
import { Node } from 'solidity-ast/node';
import { findAll } from 'solidity-ast/utils';

import path from 'path';
import { relativePath } from '../utils/relative-path';

import {
  getImportDirectives,
  getPragmaDirectives,
  getSourceIndices,
  getNodeBounds,
} from '../solc/ast-utils';
import { Transformation } from './type';

export function* appendInitializableImport(
  contractsDir: string,
  sourceUnit: SourceUnit,
): Generator<Transformation> {
  const contracts = [...findAll('ContractDefinition', sourceUnit)];
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

export function appendDirective(fileNode: Node, directive: string): Transformation {
  const retVal = {
    kind: 'append-directive',
    start: 0,
    length: 0,
    text: directive,
  };
  const importsAndPragmas = [...getPragmaDirectives(fileNode), ...getImportDirectives(fileNode)];
  if (importsAndPragmas.length) {
    const [last] = importsAndPragmas.slice(-1);
    const [start, len] = getSourceIndices(last);
    retVal.start = start + len;
    retVal.length = 0;
  }

  return retVal;
}
