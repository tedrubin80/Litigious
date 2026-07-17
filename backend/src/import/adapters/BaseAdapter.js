/**
 * Base adapter — shared HTTP helpers and ref cache for two-phase fetch+resolve.
 */
const axios = require('axios');

class BaseAdapter {
  constructor(sourceId, { supportsApi = true, supportsCsvFallback = false } = {}) {
    this.sourceId = sourceId;
    this.supportsApi = supportsApi;
    this.supportsCsvFallback = supportsCsvFallback;
  }

  /** @param {import('../canonical/types').EntityType} entity */
  entityNotSupported(entity) {
    throw new Error(`${this.sourceId} does not support entity type: ${entity}`);
  }

  async authenticate(config) {
    if (!config?.accessToken) {
      throw new Error(`${this.sourceId}: accessToken is required`);
    }
    return {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: config.expiresAt ? new Date(config.expiresAt) : undefined,
      refCache: new Map(),
      config
    };
  }

  async apiGet(session, url, params = {}) {
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/json'
      },
      timeout: 60000
    });
    return response.data;
  }

  cacheRef(session, type, id, record) {
    if (!session.refCache) session.refCache = new Map();
    session.refCache.set(`${type}:${id}`, record);
  }

  getCachedRef(session, type, id) {
    return session.refCache?.get(`${type}:${id}`);
  }

  /** Strip unresolved PP-style refs — override in subclass */
  async resolve(_raw, _entity, _session) {
    throw new Error('resolve() must be implemented by adapter');
  }

  async fetchRaw(_session, _entity, _cursor) {
    throw new Error('fetchRaw() must be implemented by adapter');
  }
}

module.exports = BaseAdapter;
