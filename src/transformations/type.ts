interface TransformationText {
  kind: string;
  start: number;
  length: number;
  text: string;
}

interface TransformationFunction {
  kind: string;
  start: number;
  length: number;
  transform: (source: string) => string;
}

export type Transformation = TransformationText | TransformationFunction;
