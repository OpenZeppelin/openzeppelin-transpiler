import { Artifact } from './solc/artifact';

export type ArtifactsMap = {
  [N in number]?: Artifact;
};
