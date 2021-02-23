import hre from 'hardhat';
import type { BuildInfo } from 'hardhat/types';

import { promises as fs } from 'fs';
import path from 'path';

export async function getBuildInfo(version: string): Promise<BuildInfo> {
  const buildInfoPath = path.join(hre.config.paths.artifacts, 'build-info');
  const filenames = await fs.readdir(buildInfoPath);
  const buildInfos: BuildInfo[] = await Promise.all(
    filenames.map(async f => JSON.parse(await fs.readFile(path.join(buildInfoPath, f), 'utf8'))),
  );

  const matching = buildInfos.filter(i => i.solcVersion.startsWith(version));

  if (matching.length > 1) {
    throw new Error('More than 1 matching compilation found');
  } else if (matching.length < 1) {
    throw new Error('Compilation not found');
  }

  return matching[0];
}
