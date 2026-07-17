# Deploy on Vercel

Litigious is a **monorepo** with two Vercel-friendly surfaces:

| Service | Folder | Role |
|---------|--------|------|
| `marketing` | `website/` | Static product site |
| `app` | `frontend/` | Vite SPA (staff + client portal) |

The **API + PostgreSQL** stack should run on **Railway**, a VPS, or Docker — not Vercel (Prisma, uploads, Socket.IO, demo auto-reset).

## One Vercel project (recommended) — `vercel.json` Services

Vercel **requires a root [`vercel.json`](../vercel.json)** when deploying multiple services from one repo.

> **Requires Vercel Services** on your team/project. In the project dashboard, confirm the framework/mode supports `services` in `vercel.json`. If you see `404 NOT_FOUND` or `DEPLOYMENT_NOT_FOUND` with an ID like `iad1::gs542-...`, see [Troubleshooting](#troubleshooting) below.

1. Vercel → **Add New Project** → import this repo
2. **Root Directory**: leave as **`.`** (repository root) — not `frontend/` or `website/`
3. Vercel reads [`vercel.json`](../vercel.json) at the repo root and builds both services
4. Set environment variables (Project → Settings → Environment Variables):

**App service (`frontend/`)**

```bash
VITE_API_URL=/api
VITE_DEMO_MODE=true
VITE_APP_NAME=Litigious
VITE_MARKETING_URL=https://your-marketing-domain.example.com
```

**Backend proxy** — add a top-level rewrite in root `vercel.json` when your API is ready:

```json
{
  "source": "/api/:path*",
  "destination": "https://YOUR-RAILWAY-HOST.up.railway.app/api/:path*"
}
```

Set `VITE_API_URL=/api` on the app service when using this proxy.

### Default routing (host-based)

| Host | Service |
|------|---------|
| `litigious.online`, `app.*` | `app` (React SPA) |
| Everything else (e.g. `litigiousweb.vercel.app`) | `marketing` (static site) |

Adjust the `has.host` rules in root `vercel.json` for your domains.

### Local dev with all services

```bash
vercel dev
# or offline:
vercel dev -L
```

## Alternative: two separate Vercel projects

If you prefer one project per folder (older pattern), create **two** Vercel projects:

| Project | Root Directory | Config |
|---------|----------------|--------|
| Marketing | `website` | [`website/vercel.json`](../website/vercel.json) |
| App | `frontend` | [`frontend/vercel.json`](../frontend/vercel.json) |

Set `VITE_API_URL` to your full API URL (e.g. `https://api.example.com/api`) when not using the root `/api` proxy.

## Recommended DNS layout

```
marketing.example.com   →  Vercel (marketing service or website project)
app.example.com         →  Vercel (app service or frontend project)
api.example.com         →  Railway / VPS (backend/)
```

Example mapping for Litigious:

```
litigiousweb.vercel.app → marketing
litigious.online        → app
api.litigious.online    → Railway backend
```

## Backend on Railway

See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md). After the API is live, point the root `vercel.json` `/api` rewrite at that host so the SPA can use `VITE_API_URL=/api`.

## Going to production

Disable demo UI and auto-reset — see [GOING_TO_PRODUCTION.md](GOING_TO_PRODUCTION.md).

## Troubleshooting

### `404 NOT_FOUND` / `DEPLOYMENT_NOT_FOUND` — ID like `iad1::gs542-...`

Vercel generated that ID at the edge (region `iad1`). Common causes:

| Cause | Fix |
|-------|-----|
| **Root Directory** still set to `frontend/` or `website/` | Set to **`.`** (repo root) so root `vercel.json` is used |
| **Services not enabled** on your Vercel team | Use [two separate projects](#alternative-two-separate-vercel-projects) instead, or enable Services |
| **Invalid `/api` rewrite** to a bad host | Remove the rewrite until Railway API is live, or fix the URL |
| **Custom domain** points at an old/deleted deployment | Project → Domains → reassign production domain to latest deployment |
| **Preview URL** (`*.vercel.app`) shows 404 | Default rewrite now routes unmatched hosts to `app`; redeploy after pull |

Check **Deployments** in the Vercel dashboard for the commit — GitHub may show ✅ even if a specific domain alias is stale.

### GitHub Actions CI fails (separate from Vercel)

CI may fail on backend tests if Postgres is not available in the runner. That does not block Vercel frontend deploys unless you enabled “Require status checks.”

## Related

- [INSTALL.md](INSTALL.md)
- [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)
