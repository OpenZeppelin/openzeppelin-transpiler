import path from 'path';

export function renameContract(name: string): string {
  return name + 'UpgradeSafe';
}

export function renamePath(filePath: string): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({ dir, ext, name: renameContract(name) });
}
