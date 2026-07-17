# LMS Migration Import

Migrate clients, cases, and time entries from other legal practice management systems into Litigious.

## Supported sources

| Source | API import | CSV fallback |
|--------|------------|--------------|
| Clio | Yes | Yes |
| MyCase | Yes (tier check optional) | Yes |
| PracticePanther | Yes | No |

## Architecture

The import system uses a **canonical model** — every adapter produces the same internal shapes regardless of source:

- **Contacts** → `Client` records
- **Matters** → `Case` records
- **Time entries** → `TimeEntry` records (duration stored as **seconds** in the canonical layer, converted to decimal hours on write)

Each adapter implements a four-phase contract:

1. **authenticate** — OAuth token / session setup
2. **fetchRaw** — paginated fetch; may return unresolved reference stubs
3. **resolve** — hydrate stubs into canonical records
4. **parseCsvExport** (optional) — CSV fallback when API access is unavailable

The **import pipeline** (`runImport`) is source-agnostic: fetch → resolve → dedupe → validate → dry run → commit.

## Admin UI

Navigate to **Admin → LMS Import** (`/app/admin/import`).

1. Choose source system and import method (CSV recommended for first test)
2. Select entities (import in order: contacts → matters → time entries)
3. Start import — always runs as **dry run** first
4. Review counts and validation errors
5. Click **Commit to database** when satisfied

## API endpoints (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/import/sources` | List available adapters |
| GET | `/api/import/jobs` | List recent jobs |
| POST | `/api/import/jobs` | Create import job |
| GET | `/api/import/jobs/:id` | Job status + preview summary |
| POST | `/api/import/jobs/:id/run` | Execute import (multipart for CSV files: `csv_contacts`, `csv_matters`, `csv_timeEntries`) |
| POST | `/api/import/jobs/:id/commit` | Commit dry-run preview to database |
| DELETE | `/api/import/jobs/:id` | Delete pending/dry-run job |

## OAuth tokens (API mode)

Obtain an access token from your source system's developer portal or OAuth flow, then paste it when creating an API import job. Tokens are stored on the job record for the duration of the import — rotate tokens after migration.

### Clio

Register an app at [Clio Developer Portal](https://app.clio.com/api/v4/documentation) and use OAuth2 authorization code flow. Required scopes: contacts, matters, activities (time entries).

### MyCase

MyCase API access requires a supported subscription tier. Set `requiresTierCheck: true` in auth config to validate before fetch.

### PracticePanther

Use PracticePanther API v2 OAuth credentials. The adapter dereferences `account_ref` and `matter_ref` stubs during the resolve phase.

## CSV format

### Clio

Export contacts and matters from Clio reporting. Expected columns include:

- Contacts: `id`, `First Name`, `Last Name`, `Primary Email`, `Primary Phone`
- Matters: `Matter ID`, `Client ID`, `Matter Name`, `Status`, `Practice Area`

### MyCase

Use MyCase client/case export CSVs. See `backend/src/import/adapters/csv/mycaseCsv.js` for column mappings.

## Audit trail

Committed imports write rows to `import_external_mappings` linking `externalId` + `externalSource` → internal Litigious IDs. This supports re-import detection and compliance audit.

## Database migration

Apply the import tables:

```bash
cd backend
npx prisma db push
# or run backend/prisma/migrations/add_import_jobs.sql manually
```

## Tests

```bash
cd backend
npm test -- import-pipeline.test.js
```
