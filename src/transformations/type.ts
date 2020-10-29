export interface Bounds {
  start: number;
  length: number
}

interface TransformationText extends Bounds {
  kind: string;
  text: string;
}

interface TransformationFunction extends Bounds {
  kind: string;
  transform: (source: string, readShifted: (b: Bounds) => string) => string;
}

export type Transformation = TransformationText | TransformationFunction;
