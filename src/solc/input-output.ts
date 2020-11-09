import { SourceUnit } from 'solidity-ast';

export interface SolcInput {
  sources: {
    [file in string]: { content: string } | { urls: string[] };
  };
}

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: {
        storageLayout?: StorageLayout;
      };
    };
  };
  sources: {
    [file in string]: {
      ast: SourceUnit;
      id: number;
    };
  };
}

export interface StorageLayout {
  storage: {
    astId: number;
    type: string;
  }[];
  types:
    | null
    | {
        [t in string]?: {
          numberOfBytes: string; // ascii number
        };
      };
}
