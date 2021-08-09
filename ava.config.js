export default {
  verbose: true,
  files: ['**/test.{js,ts}', '**/*.test.{js,ts}'],
  ignoredByWatcher: ['**/*.{ts,map,tsbuildinfo}', '**/cache/*', '**/artifacts/*'],
  typescript: {
    rewritePaths: { 'src/': 'dist/' },
    compile: false,
  },
};
