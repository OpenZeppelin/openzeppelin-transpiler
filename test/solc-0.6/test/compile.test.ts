import { transpileAndSaveContracts, compileContracts } from './setup';

describe('When all the contracts transpilied and saved to contracts folder', (): void => {
  beforeAll(
    async (): Promise<void> => {
      await transpileAndSaveContracts(
        [
          'ElementaryTypesWithConstructor',
          'ElementaryTypes',
          'Deep',
          'SIC',
          'DC',
          'CIB',
          'StringConstructor',
          'Local',
          'Parent1',
          'Parent2',
          'Child',
        ],
        './build/contracts/',
      );
    },
  );
  it('upgradeable contracts successfully compile', async (): Promise<void> => {
    jest.setTimeout(10000);
    await compileContracts();
  });
});
