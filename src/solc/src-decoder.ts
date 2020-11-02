import { SolcOutput } from './input-output';

export interface SourceLocation {
  start: number;
  length: number;
  source: string;
}

export type SrcDecoder = (src: string) => SourceLocation;

export function srcDecoder(output: SolcOutput): SrcDecoder {
  return src => {
    const [start, length, sourceId] = src.split(':').map(s => parseInt(s));
    const source = Object.keys(output.sources).find(s => output.sources[s].id === sourceId);
    if (source === undefined) {
      throw new Error(`No source with id ${sourceId}`);
    }
    return { start, length, source };
  };
}
