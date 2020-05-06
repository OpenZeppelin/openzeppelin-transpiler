import { shouldTranspileToValidContract } from './LocalContract.behaviour';

describe(`SimpleInheritance contract`, (): void => {
  shouldTranspileToValidContract('Child', {
    Child: {
      path: 'Override',
      fileName: 'Override',
      contracts: ['Child', 'Parent2', 'Parent1'],
    },
  });
});
