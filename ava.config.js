export default {
  verbose: true,
  files: ['**/test.{js,ts}', '**/*.test.{js,ts}'],
  ignoredByWatcher: ['**/*.{ts,map,tsbuildinfo}'],
  typescript: { rewritePaths: { 'src/': 'dist/' } },
};
