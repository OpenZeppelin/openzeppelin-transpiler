import { SourceUnit } from 'solidity-ast';

export interface SolcInput {
  sources: {
    [file in string]: { content: string } | { urls: string[] };
  };
}

export interface SolcOutput {
  contracts: {
    [file in string]: {
      [contract in string]: unknown;
    };
  };
  sources: {
    [file in string]: {
      ast: SourceUnit;
      id: number;
    };
  };
}
