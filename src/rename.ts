import path from 'path';

const suffix = 'Upgradeable';

export function renameContract(name: string): string {
  if (name.endsWith(suffix)) {
    return name;
  } else {
    return name + suffix;
  }
}

export function renamePath(filePath: string): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({ dir, ext, name: renameContract(name) });
}
