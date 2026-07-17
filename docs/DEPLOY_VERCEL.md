# Deploy on Vercel

Litigious is a **monorepo** with two Vercel-friendly surfaces:

| Service | Folder | Role |
|---------|--------|------|
| `marketing` | `website/` | Static product site |
| `app` | `frontend/` | Vite SPA (staff + client portal) |

The **API + PostgreSQL** stack should run on **Railway**, a VPS, or Docker — not Vercel (Prisma, uploads, Socket.IO, demo auto-reset).

## One Vercel project (recommended) — `vercel.json` Services

Vercel **requires a root [`vercel.json`](../vercel.json)** when deploying multiple services from one repo.

1. Vercel → **Add New Project** → import this repo
2. **Root Directory**: leave as **`.`** (repository root)
3. Vercel reads [`vercel.json`](../vercel.json) at the repo root and builds both services
4. Set environment variables (Project → Settings → Environment Variables):

**App service (`frontend/`)**

```bash
VITE_API_URL=/api
VITE_DEMO_MODE=true
VITE_APP_NAME=Litigious
VITE_MARKETING_URL=https://your-marketing-domain.example.com
```

**Backend proxy** — edit the `/api` rewrite in root `vercel.json` and replace `REPLACE_WITH_YOUR_API_HOST` with your Railway (or other) API host, e.g. `litigious-api.up.railway.app` (no `https://` in the placeholder line — the file includes it).

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

## Related

- [INSTALL.md](INSTALL.md)
- [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)
