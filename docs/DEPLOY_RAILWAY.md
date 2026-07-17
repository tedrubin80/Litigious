# Deploy on Railway

Litigious is a **monorepo** with three Railway services: PostgreSQL, backend, frontend.

## Services

| Service | Root directory | Config file |
|---------|----------------|-------------|
| PostgreSQL | (Railway plugin) | — |
| API | `/backend` | `backend/railway.toml` |
| Web app | `/frontend` | `frontend/railway.toml` |

## Step-by-step

### 1. Create project

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your fork of Litigious

### 2. Add PostgreSQL

**New** → **Database** → **PostgreSQL**

### 3. Backend service

1. **New** → **GitHub Repo** → same repo
2. **Settings** → **Root Directory**: `backend`
3. Railway reads `backend/railway.toml` automatically
4. **Variables** (minimum):

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
JWT_SECRET=<openssl rand -hex 32>
SESSION_SECRET=<openssl rand -hex 32>
FRONTEND_URL=https://<your-frontend>.up.railway.app
ALLOWED_ORIGINS=https://<your-frontend>.up.railway.app
```

5. Deploy — `preDeployCommand` runs `prisma db push`

### 4. Frontend service

1. **New** → **GitHub Repo** → same repo
2. **Root Directory**: `frontend`
3. **Variables**:

```bash
VITE_API_URL=https://<your-backend>.up.railway.app/api
```

4. Build uses `npm run build`; start serves `dist/` via `serve`

### 5. Seed (optional)

Railway shell on backend service:

```bash
npm run seed:demo
```

## Publish a Railway template

Railway templates are created in the **dashboard**, not via a repo file:

1. Deploy the three services as above until everything works
2. Project **Settings** → **Generate Template from Project**
3. Refine in **Template Composer** (variable prompts, descriptions)
4. Publish to [Railway Templates](https://railway.com/templates)

Reference checklist: [`deploy/railway/TEMPLATE.md`](../deploy/railway/TEMPLATE.md)

## Troubleshooting

- **Build fails on Prisma**: Ensure `DATABASE_URL` is set before first deploy
- **CORS errors**: Update `FRONTEND_URL` and `ALLOWED_ORIGINS` to the live frontend URL
- **502 on frontend**: Confirm `VITE_API_URL` includes `/api` suffix

See also: [Railway monorepo docs](https://docs.railway.com/deployments/monorepo)
