import path from 'path';

const suffix = 'Upgradeable';
const initName = 'Initializable';

export function isRenamed(name: string): boolean {
  return path.basename(name, '.sol').endsWith(suffix);
}

export function renameContract(name: string, _suffix = suffix): string {
  if ((name === initName) || name.endsWith(_suffix)) {
    return name;
  } else {
    return name + _suffix;
  }
}

export function renamePath(filePath: string, _suffix = suffix): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({ dir, ext, name: renameContract(name, _suffix) });
}

export function getContractsImportPath(contractPaths: Map<string, Set<string>>, suffix = 'Upgradeable') : string {
  let importsText = '';
  contractPaths.forEach( (contractNames, filePath ) => {
    const renamedContractNames = [...contractNames].map(c => renameContract(c, suffix));
    const cNames = ((renamedContractNames.length > 0) ? `{ ${renamedContractNames.join(', ')} } from ` : '');
    importsText += `\nimport ${cNames}"${renamePath(filePath, suffix)}";`;
  });
  return importsText;
}
