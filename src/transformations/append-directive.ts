import { getImportDirectives, getPragmaDirectives, getSourceIndices } from '../solc/ast-utils';
import { Node } from '../solc/ast-node';
import { Transformation } from './type';

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
