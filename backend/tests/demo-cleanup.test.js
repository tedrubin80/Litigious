const { purgeUserUploads } = require('../src/lib/demoCleanup');

describe('demoCleanup', () => {
  test('purgeUserUploads returns result without throwing', () => {
    const result = purgeUserUploads();
    expect(result).toHaveProperty('totalRemoved');
    expect(result).toHaveProperty('demoSampleDir');
    expect(result.demoSampleDir).toMatch(/uploads[/\\]demo$/);
  });
});
