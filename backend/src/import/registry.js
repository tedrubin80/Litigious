const ClioAdapter = require('./adapters/ClioAdapter');
const MyCaseAdapter = require('./adapters/MyCaseAdapter');
const PracticePantherAdapter = require('./adapters/PracticePantherAdapter');

const ADAPTERS = {
  clio: new ClioAdapter(),
  mycase: new MyCaseAdapter(),
  practicepanther: new PracticePantherAdapter()
};

const getAdapter = (sourceId) => {
  const adapter = ADAPTERS[sourceId];
  if (!adapter) {
    throw new Error(`Unknown import source: ${sourceId}`);
  }
  return adapter;
};

const listSources = () =>
  Object.values(ADAPTERS).map((adapter) => ({
    sourceId: adapter.sourceId,
    supportsApi: adapter.supportsApi,
    supportsCsvFallback: adapter.supportsCsvFallback
  }));

module.exports = {
  getAdapter,
  listSources,
  ADAPTERS
};
