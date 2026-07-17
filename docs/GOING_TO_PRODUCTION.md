# Going to production

This repository **ships in demo mode by default** so you can clone, run, and explore immediately. Turn demo off before running a real firm deployment.

## What demo mode does

| Layer | When enabled |
|-------|----------------|
| **Frontend** (`VITE_DEMO_MODE=true`) | Demo banner, watermark, guided tour, credential hints on login |
| **Backend** (`DEMO_MODE=true`) | Marks the instance as a showcase deployment |
| **Auto-reset** (`DEMO_AUTO_RESET=true`) | On API startup and every `DEMO_RESET_INTERVAL_HOURS` (default 24): purge visitor uploads and re-run `npm run seed:demo` |

Sample data and shared passwords are documented in [DEMO_DATA.md](DEMO_DATA.md).

## Default values (`.env.example`)

Copied by `npm run setup` into `backend/.env` and `frontend/.env.local`:

**Backend**

```bash
DEMO_MODE=true
DEMO_AUTO_RESET=true
DEMO_RESET_INTERVAL_HOURS=24
```

**Frontend**

```bash
VITE_DEMO_MODE=true
```

## Switch to production

### 1. Backend — `backend/.env`

```bash
DEMO_MODE=false
DEMO_AUTO_RESET=false
```

Also set (minimum):

- `JWT_SECRET` and `SESSION_SECRET` — strong random values (`openssl rand -hex 32`)
- `DATABASE_URL` — your production Postgres
- `ALLOWED_ORIGINS` / `FRONTEND_URL` — your app URL
- `ALLOW_PUBLIC_REGISTRATION=false` unless you control onboarding

Do **not** run `npm run seed:demo` on a production database — it wipes users and cases.

Create your admin with your own process (e.g. `backend/scripts/setup-super-admin.js` with real credentials).

### 2. Frontend — `frontend/.env.local`

```bash
VITE_DEMO_MODE=false
```

Rebuild after changing env vars:

```bash
npm run build
```

### 3. Optional branding

See [BRAND.md](BRAND.md) for `VITE_APP_NAME`, `APP_NAME`, and marketing URLs.

### 4. Verify

- No demo banner on the app
- No automatic data resets in API logs
- Login with your real admin account, not `@litigious.online` demo emails

## Quick reference

| Goal | Backend | Frontend |
|------|---------|----------|
| Public demo (litigious.online) | `DEMO_MODE=true`, `DEMO_AUTO_RESET=true` | `VITE_DEMO_MODE=true` |
| Local try-out | Same as demo (defaults) | Same as demo |
| Production firm | `DEMO_MODE=false`, `DEMO_AUTO_RESET=false` | `VITE_DEMO_MODE=false` |
| Demo UI only, no auto-reset | `DEMO_MODE=true`, `DEMO_AUTO_RESET=false` | `VITE_DEMO_MODE=true` |
