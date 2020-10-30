import { promises as fs } from 'fs';
import path from 'path';

import { SourceUnit } from './ast-node';
import { SolcOutput } from './output';

export interface Artifact {
  contractName: string;
  fileName: string;
  ast: SourceUnit;
  source: string;
  sourcePath: string;
}

export async function buildArtifacts(solcOutput: SolcOutput): Promise<Artifact[]> {
  const artifacts: Artifact[] = [];
  for (const sourcePath in solcOutput.contracts) {
    for (const contractName in solcOutput.contracts[sourcePath]) {
      const { ast } = solcOutput.sources[sourcePath];
      const source = await fs.readFile(ast.absolutePath, 'utf8');
      const fileName = path.basename(sourcePath);
      artifacts.push({ contractName, fileName, sourcePath, ast, source });
    }
  }
  return artifacts;
}
