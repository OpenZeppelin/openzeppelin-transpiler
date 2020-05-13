import { SourceUnit } from './ast-node';

export interface Artifact {
  contractName: string;
  fileName: string;
  ast: SourceUnit;
  source: string;
  sourcePath: string;
  storageLayout?: StorageLayout;
}

export interface StorageLayout {
  storage: {
    astId: number;
    type: string;
  }[];
  types: {
    [t in string]?: {
      numberOfBytes: string; // ascii number
    };
  };
}
