import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '../Icons';
import { useToast } from '../Common/Toast';

const SOURCE_LABELS = {
  clio: 'Clio',
  mycase: 'MyCase',
  practicepanther: 'PracticePanther'
};

const ENTITY_LABELS = {
  contacts: 'Contacts / Clients',
  matters: 'Matters / Cases',
  timeEntries: 'Time Entries'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  fetching: 'bg-blue-100 text-blue-800',
  resolving: 'bg-blue-100 text-blue-800',
  validating: 'bg-yellow-100 text-yellow-800',
  dry_run_ready: 'bg-green-100 text-green-800',
  committing: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const ImportMigration = () => {
  const toast = useToast();
  const [sources, setSources] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    sourceId: 'clio',
    importMode: 'csv',
    accessToken: '',
    entitiesRequested: ['contacts', 'matters'],
    dryRun: true
  });

  const [csvFiles, setCsvFiles] = useState({ contacts: null, matters: null, timeEntries: null });

  const fetchSources = useCallback(async () => {
    const response = await axios.get('/api/import/sources');
    setSources(response.data.sources || []);
  }, []);

  const fetchJobs = useCallback(async () => {
    const response = await axios.get('/api/import/jobs');
    setJobs(response.data.jobs || []);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchSources(), fetchJobs()]);
    } catch (error) {
      toast.error('Failed to load import data');
    } finally {
      setLoading(false);
    }
  }, [fetchJobs, fetchSources, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeJob || ['done', 'failed', 'dry_run_ready'].includes(activeJob.status)) return undefined;

    const timer = setInterval(async () => {
      try {
        const response = await axios.get(`/api/import/jobs/${activeJob.id}`);
        setActiveJob(response.data.job);
        if (['done', 'failed', 'dry_run_ready'].includes(response.data.job.status)) {
          fetchJobs();
        }
      } catch {
        /* polling errors are non-fatal */
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [activeJob, fetchJobs]);

  const toggleEntity = (entity) => {
    setForm((prev) => {
      const set = new Set(prev.entitiesRequested);
      if (set.has(entity)) set.delete(entity);
      else set.add(entity);
      return { ...prev, entitiesRequested: [...set] };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload = {
        sourceId: form.sourceId,
        importMode: form.importMode,
        entitiesRequested: form.entitiesRequested,
        dryRun: form.dryRun
      };

      if (form.importMode === 'api') {
        payload.authConfig = { accessToken: form.accessToken };
      }

      const createRes = await axios.post('/api/import/jobs', payload);
      const job = createRes.data.job;

      const formData = new FormData();
      if (form.importMode === 'csv') {
        form.entitiesRequested.forEach((entity) => {
          if (csvFiles[entity]) {
            formData.append(`csv_${entity}`, csvFiles[entity]);
          }
        });
      }

      await axios.post(`/api/import/jobs/${job.id}/run`, formData, {
        headers: formData.has('csv_contacts') || formData.has('csv_matters') || formData.has('csv_timeEntries')
          ? { 'Content-Type': 'multipart/form-data' }
          : undefined
      });

      setActiveJob({ ...job, status: 'fetching' });
      toast.success('Import job started — dry run in progress');
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start import');
    } finally {
      setCreating(false);
    }
  };

  const handleCommit = async () => {
    if (!activeJob) return;
    try {
      const response = await axios.post(`/api/import/jobs/${activeJob.id}/commit`);
      toast.success(`Committed: ${response.data.stats?.clients || 0} clients, ${response.data.stats?.matters || 0} cases`);
      const updated = await axios.get(`/api/import/jobs/${activeJob.id}`);
      setActiveJob(updated.data.job);
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Commit failed');
    }
  };

  const selectedSource = sources.find((s) => s.sourceId === form.sourceId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">LMS Migration Import</h1>
        <p className="mt-2 text-sm text-gray-600">
          Migrate clients, cases, and time entries from Clio, MyCase, or PracticePanther.
          Every import runs as a dry run first — review counts and errors before committing.
        </p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium">Recommended order</p>
          <p className="mt-1">Import contacts first, then matters, then time entries. Time quantity is stored in seconds internally and converted to billable hours on commit.</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source system</label>
            <select
              value={form.sourceId}
              onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {sources.map((source) => (
                <option key={source.sourceId} value={source.sourceId}>
                  {SOURCE_LABELS[source.sourceId] || source.sourceId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Import method</label>
            <select
              value={form.importMode}
              onChange={(e) => setForm({ ...form, importMode: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="csv">CSV export (recommended to start)</option>
              <option value="api" disabled={!selectedSource?.supportsApi}>OAuth API token</option>
            </select>
          </div>
        </div>

        {form.importMode === 'api' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access token</label>
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              placeholder="Paste OAuth access token from your source LMS"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Entities to import</label>
          <div className="flex flex-wrap gap-4">
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.entitiesRequested.includes(key)}
                  onChange={() => toggleEntity(key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {form.importMode === 'csv' && selectedSource?.supportsCsvFallback && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">CSV files</label>
            {form.entitiesRequested.map((entity) => (
              <div key={entity} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-40">{ENTITY_LABELS[entity]}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFiles({ ...csvFiles, [entity]: e.target.files?.[0] || null })}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.dryRun}
              onChange={(e) => setForm({ ...form, dryRun: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Dry run only (always recommended first)
          </label>

          <button
            type="submit"
            disabled={creating || form.entitiesRequested.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <CloudArrowUpIcon className="h-4 w-4" />
            )}
            Start import
          </button>
        </div>
      </form>

      {activeJob && (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Active job</h2>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[activeJob.status] || STATUS_COLORS.pending}`}>
              {activeJob.status.replace(/_/g, ' ')}
            </span>
          </div>

          {activeJob.preview && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-2xl font-semibold">{activeJob.preview.contacts ?? 0}</div>
                <div className="text-xs text-gray-500">Contacts</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-2xl font-semibold">{activeJob.preview.matters ?? 0}</div>
                <div className="text-xs text-gray-500">Matters</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-2xl font-semibold">{activeJob.preview.timeEntries ?? 0}</div>
                <div className="text-xs text-gray-500">Time entries</div>
              </div>
            </div>
          )}

          {activeJob.errors?.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {activeJob.errors.length} validation issue(s)
              </div>
              <ul className="mt-2 text-xs text-amber-900 space-y-1 max-h-32 overflow-y-auto">
                {activeJob.errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>{err.entity}: {err.message}</li>
                ))}
              </ul>
            </div>
          )}

          {activeJob.status === 'dry_run_ready' && (
            <button
              type="button"
              onClick={handleCommit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Commit to database
            </button>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent jobs</h2>
          <button type="button" onClick={refresh} className="text-sm text-blue-600 hover:text-blue-800">
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No import jobs yet</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preview</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setActiveJob(job)}
                >
                  <td className="px-6 py-4 text-sm">{SOURCE_LABELS[job.sourceId] || job.sourceId}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] || ''}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {job.preview
                      ? `${job.preview.contacts || 0} / ${job.preview.matters || 0} / ${job.preview.timeEntries || 0}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ImportMigration;
