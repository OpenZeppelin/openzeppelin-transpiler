import path from 'path';

export function renameContract(name: string): string {
  return name + 'UpgradeSafe';
}
