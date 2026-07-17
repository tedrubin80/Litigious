const prisma = require('../lib/prisma');
const { getAdapter, listSources } = require('../import/registry');
const { emptyProgress, ENTITY_TYPES } = require('../import/canonical/types');
const { runImport, commitDryRun, sortEntities } = require('../import/pipeline/runImport');

const runningJobs = new Set();

const parseJsonField = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const jobToResponse = (job) => ({
  id: job.id,
  sourceId: job.sourceId,
  importMode: job.importMode,
  status: job.status,
  entitiesRequested: parseJsonField(job.entitiesRequested, []),
  progress: parseJsonField(job.progress, emptyProgress()),
  errors: parseJsonField(job.errors, []),
  dryRun: job.dryRun,
  preview: job.preview ? summarizePreview(parseJsonField(job.preview, {})) : null,
  startedAt: job.startedAt,
  completedAt: job.completedAt,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt
});

const summarizePreview = (preview) => ({
  contacts: (preview.contacts || []).length,
  matters: (preview.matters || []).length,
  timeEntries: (preview.timeEntries || []).length,
  sample: {
    contacts: (preview.contacts || []).slice(0, 3),
    matters: (preview.matters || []).slice(0, 3),
    timeEntries: (preview.timeEntries || []).slice(0, 3)
  }
});

exports.listSources = (_req, res) => {
  res.json({ success: true, sources: listSources() });
};

exports.listJobs = async (req, res) => {
  try {
    const jobs = await prisma.importJob.findMany({
      where: { createdById: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, jobs: jobs.map(jobToResponse) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getJob = async (req, res) => {
  try {
    const job = await prisma.importJob.findFirst({
      where: { id: req.params.id, createdById: req.user.id }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found' });
    }

    const response = jobToResponse(job);
    if (req.query.fullPreview === 'true' && job.preview) {
      response.preview = parseJsonField(job.preview, {});
    }

    res.json({ success: true, job: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    const {
      sourceId,
      entitiesRequested = ['contacts', 'matters'],
      dryRun = true,
      importMode = 'api',
      authConfig = {}
    } = req.body;

    if (!sourceId) {
      return res.status(400).json({ success: false, message: 'sourceId is required' });
    }

    getAdapter(sourceId);

    const entities = sortEntities(
      (entitiesRequested || []).filter((entity) => ENTITY_TYPES.includes(entity))
    );

    if (entities.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid entities requested' });
    }

    if (importMode === 'api' && !authConfig.accessToken) {
      return res.status(400).json({ success: false, message: 'accessToken is required for API import' });
    }

    const job = await prisma.importJob.create({
      data: {
        sourceId,
        importMode,
        dryRun: Boolean(dryRun),
        entitiesRequested: entities,
        progress: emptyProgress(),
        errors: [],
        authConfig: importMode === 'api' ? authConfig : null,
        createdById: req.user.id
      }
    });

    res.status(201).json({ success: true, job: jobToResponse(job) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const executeJob = async (jobId, userId, csvBuffers = {}) => {
  const job = await prisma.importJob.findFirst({
    where: { id: jobId, createdById: userId }
  });
  if (!job) throw new Error('Import job not found');

  const adapter = getAdapter(job.sourceId);

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'fetching', startedAt: new Date(), errors: [] }
  });

  const result = await runImport(adapter, job, {
    prisma,
    userId,
    csvBuffers
  });

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: result.status,
      progress: result.progress,
      errors: result.errors,
      preview: result.preview,
      completedAt: result.completedAt || null
    }
  });

  return result;
};

exports.runJob = async (req, res) => {
  const jobId = req.params.id;

  if (runningJobs.has(jobId)) {
    return res.status(409).json({ success: false, message: 'Import already running' });
  }

  try {
    const job = await prisma.importJob.findFirst({
      where: { id: jobId, createdById: req.user.id }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found' });
    }

    if (['fetching', 'resolving', 'validating', 'committing'].includes(job.status)) {
      return res.status(409).json({ success: false, message: 'Import already in progress' });
    }

    const csvBuffers = {};
    if (req.files?.length) {
      for (const file of req.files) {
        const entity = file.fieldname.replace(/^csv_/, '');
        csvBuffers[entity] = file.buffer;
      }
    }

    runningJobs.add(jobId);
    res.json({ success: true, message: 'Import started', jobId });

    executeJob(jobId, req.user.id, csvBuffers)
      .catch(async (error) => {
        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errors: [{ entity: 'contacts', externalId: 'job', stage: 'fetch', message: error.message }],
            completedAt: new Date()
          }
        });
      })
      .finally(() => runningJobs.delete(jobId));
  } catch (error) {
    runningJobs.delete(jobId);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.commitJob = async (req, res) => {
  try {
    const job = await prisma.importJob.findFirst({
      where: { id: req.params.id, createdById: req.user.id }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found' });
    }

    if (job.status !== 'dry_run_ready') {
      return res.status(400).json({
        success: false,
        message: 'Job must complete a dry run before commit'
      });
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: 'committing' }
    });

    const preview = parseJsonField(job.preview, {});
    const result = await commitDryRun({ ...job, preview }, { prisma, userId: req.user.id });

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: result.status,
        completedAt: result.completedAt,
        dryRun: false
      }
    });

    res.json({ success: true, stats: result.stats });
  } catch (error) {
    await prisma.importJob.update({
      where: { id: req.params.id },
      data: { status: 'failed' }
    }).catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await prisma.importJob.findFirst({
      where: { id: req.params.id, createdById: req.user.id }
    });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Import job not found' });
    }

    if (job.status === 'done' && !job.dryRun) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a committed import job'
      });
    }

    await prisma.importJob.delete({ where: { id: job.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
