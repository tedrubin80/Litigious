# Demo / Showcase Data

Load realistic sample data for sales demos, dashboards, charts, and the client portal.

## Run manually

```bash
cd backend
npm run seed:demo
```

Or from repo root: `npm run seed:demo`

Requires `DATABASE_URL` in `backend/.env`. The script **clears** users, clients, cases, documents, tasks, activities, and related records before seeding.

It also **deletes user-uploaded files** from:

- `uploads/documents/`
- `uploads/medical/`
- `uploads/images/`
- `uploads/temp/`

**Preserved:** `uploads/demo/` (sample police report for document preview).

Optional custom password for all demo accounts:

```bash
DEMO_SEED_PASSWORD='YourDemoPass123!' npm run seed:demo
```

## Auto-reset on hosted demo

For a public demo (e.g. litigious.online), enable automatic cleanup so visitors’ uploads and data do not persist.

Add to **`backend/.env`**:

```bash
DEMO_MODE=true
DEMO_AUTO_RESET=true
DEMO_RESET_INTERVAL_HOURS=24
```

| Variable | Description |
|----------|-------------|
| `DEMO_MODE` | Marks instance as demo (enables scheduler when combined with auto-reset) |
| `DEMO_AUTO_RESET` | Run periodic cleanup + re-seed |
| `DEMO_RESET_INTERVAL_HOURS` | Hours between resets (default `24`) |
| `DEMO_AUTO_RESET_RESEED` | Set to `false` to only purge upload files, skip DB re-seed |

When the API server starts with these flags, it will:

1. Purge user upload directories (keep `uploads/demo/`)
2. Re-run the demo seed (DB reset + sample data)

**Manual reset anytime:** `npm run seed:demo`

## Login credentials

After seeding, all demo accounts share the same password (default **`DemoShow2026!`** unless overridden):

| Role | Email |
|------|-------|
| Super Admin | `admin@litigious.online` |
| Attorney | `attorney@litigious.online` |
| Paralegal | `paralegal@litigious.online` |
| Client portal | `client@litigious.online` |

Use **Staff login** for staff accounts and **Client Portal** for `client@litigious.online`.

## What gets populated

- 6 cases across the last 6 months (active, discovery, settled — powers dashboard charts)
- 3 clients (Maria Chen linked to client portal user)
- 3 documents including a file under `backend/uploads/demo/` for preview/download
- 4 tasks (including one overdue for task stats)
- 3 time entries and 8 recent activities

## Reset before a live showcase

```bash
npm run seed:demo
```

Restores a clean, consistent dataset and removes any files visitors uploaded during the demo window.
