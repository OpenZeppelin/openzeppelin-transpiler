export interface TransformHelper {
  read(node: WithSrc): string;
}

export interface WithSrc {
  src: string;
}

export interface Bounds {
  start: number;
  length: number;
}

interface TransformationText extends Bounds {
  kind: string;
  text: string;
}

interface TransformationFunction extends Bounds {
  kind: string;
  transform: (source: string, helper: TransformHelper) => string;
}

export type Transformation = TransformationText | TransformationFunction;
