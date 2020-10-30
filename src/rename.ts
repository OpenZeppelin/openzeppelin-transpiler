import path from 'path';

const suffix = 'UpgradeSafe';

export function isRenamed(name: string): boolean {
  return path.basename(name, '.sol').endsWith(suffix);
}

export function renameContract(name: string): string {
  return name + suffix;
}

export function renamePath(filePath: string): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({ dir, ext, name: renameContract(name) });
}
