# Railway template checklist

Use this when publishing a one-click Litigious template on [Railway Templates](https://railway.com/templates).

## Services to include

1. **PostgreSQL** — Railway managed database
2. **litigious-api** — GitHub repo, root `/backend`
3. **litigious-web** — GitHub repo, root `/frontend`

## Backend template variables (prompt users)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | yes | Random 64-char hex |
| `SESSION_SECRET` | yes | Random 64-char hex |
| `FRONTEND_URL` | yes | Reference `${{litigious-web.RAILWAY_PUBLIC_DOMAIN}}` |
| `ALLOWED_ORIGINS` | yes | Same as frontend URL |
| `DATABASE_URL` | auto | `${{Postgres.DATABASE_URL}}` |

## Frontend template variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | yes | `https://${{litigious-api.RAILWAY_PUBLIC_DOMAIN}}/api` |

## Service wiring order

1. Postgres
2. Backend (depends on Postgres)
3. Frontend (depends on backend URL for `VITE_API_URL`)

## After template deploy

Document in template README:

```bash
# Optional: seed demo data (Railway shell on backend)
npm run seed:demo
```

Default admin after seed: `admin@litigious.online` / see `docs/DEMO_DATA.md`

## Publishing

1. Deploy working stack in a Railway project
2. **Settings** → **Generate Template from Project**
3. Add descriptions and default variable values in Template Composer
4. Submit for marketplace (optional)

Config-as-code in repo:

- `backend/railway.toml` — build, healthcheck, preDeploy migrate
- `frontend/railway.toml` — build + static serve
