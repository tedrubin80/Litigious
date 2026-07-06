# Demo / Showcase Data

Load realistic sample data for sales demos, dashboards, charts, and the client portal.

## Run

```bash
cd backend
npm run seed:demo
```

Requires `DATABASE_URL` in `backend/.env`. The script **clears** users, clients, cases, documents, tasks, activities, and related records before seeding.

Optional: set a custom password for all demo accounts:

```bash
DEMO_SEED_PASSWORD='YourDemoPass123!' npm run seed:demo
```

## Login credentials

After seeding, all demo accounts share the same password (default **`DemoShow2026!`** unless overridden):

| Role | Email |
|------|-------|
| Super Admin | `admin@litigious.online` |
| Attorney | `attorney@litigious.online` |
| Paralegal | `paralegal@litigious.online` |
| Client portal | `client@litigious.online` |

Use **Admin login** for staff accounts and **Client Portal** for `client@litigious.online`.

## What gets populated

- 6 cases across the last 6 months (active, discovery, settled — powers dashboard charts)
- 3 clients (Maria Chen linked to client portal user)
- 3 documents including a file under `backend/uploads/demo/` for preview/download
- 4 tasks (including one overdue for task stats)
- 3 time entries and 8 recent activities

## Reset for demos

Re-run `npm run seed:demo` before each showcase to restore a clean, consistent dataset.
