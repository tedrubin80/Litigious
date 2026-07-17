# Deploy on Vercel

Litigious splits across hosts:

| Part | Folder | Host |
|------|--------|------|
| **App (demo SPA)** | `frontend/` | Vercel |
| **Marketing site** | `website/` | Vercel (separate project) |
| **API + Postgres** | `backend/` | Railway / VPS / Docker |

## Test the app on Vercel (recommended)

Use **one** Vercel project for the React app.

### Option A — Root Directory `frontend` (simplest)

1. Vercel → import `tedrubin80/Litigious`
2. **Root Directory**: `frontend`
3. Framework: **Vite** (auto-detected)
4. Build: `npm run build` · Output: `build`
5. Uses [`frontend/vercel.json`](../frontend/vercel.json)

### Option B — Root Directory `.` (repo root)

1. **Root Directory**: `.` (repository root)
2. Uses root [`vercel.json`](../vercel.json) — builds `frontend/` and outputs `frontend/build`

Both options produce a normal **static** deploy (no Vercel Services block).

### Environment variables

Set in Vercel → Project → Settings → Environment Variables (Production + Preview):

```bash
VITE_API_URL=https://YOUR-API-HOST/api
VITE_DEMO_MODE=true
VITE_APP_NAME=Litigious
VITE_MARKETING_URL=https://your-marketing-project.vercel.app
```

Redeploy after changing env vars (Vite bakes them at build time).

### API note

The SPA needs a running backend. Point `VITE_API_URL` at Railway or your VPS API (e.g. `https://litigious.online/api` if that API is public). Optional: add a rewrite in `vercel.json`:

```json
{
  "source": "/api/:path*",
  "destination": "https://YOUR-RAILWAY-HOST.up.railway.app/api/:path*"
}
```

Then set `VITE_API_URL=/api`.

---

## Marketing site (second Vercel project)

1. **Add New Project** → same repo
2. **Root Directory**: `website`
3. Framework: **Other** (static) — no build command
4. Uses [`website/vercel.json`](../website/vercel.json)

Example domains:

```
litigious-app.vercel.app      → frontend project
litigious-marketing.vercel.app → website project
litigious.online              → your VPS (demo), or point DNS elsewhere
```

---

## Why not Vercel `services` in root `vercel.json`?

We tried a root `services` block (marketing + app in one project). On many teams it builds but logs:

```text
WARNING! Build output contains no "functions" or "static" directory
```

Then the deployment URL returns `404 NOT_FOUND` / `DEPLOYMENT_NOT_FOUND` (`iad1::...`, `arn1::...`).

**Vercel Services** needs explicit platform support and correct per-service output packaging. Until that is enabled and verified, use **two projects** (or one project for `frontend/` only).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `no "functions" or "static" directory` in build log | Remove `services` from `vercel.json`; use Option A or B above |
| `DEPLOYMENT_NOT_FOUND` / `iad1::...` | Deployment has no static output — redeploy after config fix; check Domains → latest deployment |
| Blank app / API errors | Set `VITE_API_URL` to a live backend URL |
| `litigious.online` unchanged | That domain is on your VPS/nginx, not this Vercel project |
| GitHub Actions ❌ | CI Postgres tests fail separately; does not block Vercel unless you require that check |

## Related

- [INSTALL.md](INSTALL.md)
- [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)
- [GOING_TO_PRODUCTION.md](GOING_TO_PRODUCTION.md)
