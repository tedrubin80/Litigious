const { emptyProgress } = require('../canonical/types');
const { dedupeRecords } = require('./dedup');
const { validateRecords } = require('./validate');
const { writeImportPreview } = require('./writer');

const ENTITY_ORDER = ['contacts', 'matters', 'timeEntries'];

const sortEntities = (entities) =>
  [...entities].sort((a, b) => ENTITY_ORDER.indexOf(a) - ENTITY_ORDER.indexOf(b));

const runImport = async (adapter, job, { prisma, userId, csvBuffers = {} }) => {
  const errors = Array.isArray(job.errors) ? [...job.errors] : [];
  const progress = job.progress || emptyProgress();
  const preview = { contacts: [], matters: [], timeEntries: [] };

  let session = null;
  if (job.importMode !== 'csv') {
    job.status = 'fetching';
    session = await adapter.authenticate(job.authConfig || {});
  }

  for (const entity of sortEntities(job.entitiesRequested || [])) {
    if (!ENTITY_ORDER.includes(entity)) continue;

    const collected = [];

    if (job.importMode === 'csv') {
      const buffer = csvBuffers[entity];
      if (!buffer) {
        errors.push({
          entity,
          externalId: 'batch',
          stage: 'fetch',
          message: `No CSV uploaded for ${entity}`
        });
        continue;
      }

      if (!adapter.parseCsvExport) {
        errors.push({
          entity,
          externalId: 'batch',
          stage: 'fetch',
          message: `${adapter.sourceId} does not support CSV import`
        });
        continue;
      }

      job.status = 'resolving';
      const resolved = await adapter.parseCsvExport(buffer, entity);
      collected.push(...resolved);
      progress[entity].fetched += resolved.length;
      progress[entity].resolved += resolved.length;
    } else {
      let cursor;
      do {
        job.status = 'fetching';
        const { records, nextCursor } = await adapter.fetchRaw(session, entity, cursor);
        progress[entity].fetched += records.length;

        try {
          job.status = 'resolving';
          const resolved = await adapter.resolve(records, entity, session);
          collected.push(...resolved);
          progress[entity].resolved += resolved.length;
        } catch (err) {
          errors.push({
            entity,
            externalId: 'batch',
            stage: 'resolve',
            message: String(err.message || err),
            raw: records
          });
        }

        cursor = nextCursor;
      } while (cursor);
    }

    job.status = 'validating';
    const deduped = dedupeRecords(collected, entity);
    const { valid, errors: validationErrors } = validateRecords(deduped, entity, preview);
    errors.push(...validationErrors);
    preview[entity] = valid;
  }

  const result = {
    status: job.dryRun ? 'dry_run_ready' : 'committing',
    progress,
    errors,
    preview
  };

  if (!job.dryRun) {
    const stats = await writeImportPreview(preview, { prisma, userId, jobId: job.id });
    result.status = 'done';
    result.stats = stats;
    result.completedAt = new Date();
  }

  return result;
};

const commitDryRun = async (job, { prisma, userId }) => {
  if (!job.preview) {
    throw new Error('No dry-run preview to commit');
  }

  const stats = await writeImportPreview(job.preview, { prisma, userId, jobId: job.id });
  return {
    status: 'done',
    stats,
    completedAt: new Date()
  };
};

module.exports = { runImport, commitDryRun, sortEntities, ENTITY_ORDER };
