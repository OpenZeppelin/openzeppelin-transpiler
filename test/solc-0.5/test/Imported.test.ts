import { shouldTranspileToValidContract } from './LocalContract.behaviour';

describe(`Imported contract`, (): void => {
  shouldTranspileToValidContract('Local', {
    Local: {
      path: 'Local',
      fileName: 'Local',
      contracts: ['Local'],
    },
    Imported1: {
      path: 'Imported',
      fileName: 'Imported',
      contracts: ['Imported1'],
    },
    Imported2: {
      path: 'Imported',
      fileName: 'Imported',
      contracts: ['Imported2', 'Imported1'],
    },
  });
});
