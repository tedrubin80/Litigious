# Installation

Litigious runs as two services (API + web app) plus PostgreSQL.

## Requirements

- **Node.js** 18+
- **PostgreSQL** 14+
- **npm** 9+

## One-command setup

From the repository root:

```bash
npm run setup
```

This installs dependencies in root, `backend/`, and `frontend/`, and copies `.env.example` files if `.env` is missing.

## Environment

### Backend (`backend/.env`)

Copy from `backend/.env.example` and set at minimum:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `FRONTEND_URL` | App URL for CORS (e.g. `http://localhost:5173`) |
| `ALLOWED_ORIGINS` | Comma-separated origins |

### Frontend (`frontend/.env.local`)

Copy from `frontend/.env.example`:

```bash
VITE_API_URL=/api
```

For local Vite dev, configure the proxy in `vite.config.js` or set `VITE_API_URL=http://localhost:3001/api`.

## Database

```bash
npm run db:push      # apply Prisma schema
npm run seed:demo    # optional showcase data
```

## Development

```bash
npm run dev
```

- Frontend: http://localhost:5173 (Vite default)
- Backend: http://localhost:3001
- Health: http://localhost:3001/api/health

## Production build

```bash
npm run build        # builds frontend to frontend/dist
npm run start:backend
# Serve frontend/dist behind nginx or use `npm run start:frontend` (vite preview)
```

## Docker

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL and secrets in backend/.env
docker compose up --build
```

See `docker-compose.yml` — uses env vars only (no committed credentials).

## Two homepages

| Path | Deploy target | Role |
|------|---------------|------|
| `website/` | Vercel / static host | Public marketing |
| `frontend/` route `/` | Same domain as app or subdomain | Staff/client login entry |

Configure `VITE_MARKETING_URL` on the app to link to your marketing deployment.

## Troubleshooting

- **401 on API**: Check JWT cookie domain and `ALLOWED_ORIGINS`
- **Prisma errors**: Run `cd backend && npx prisma generate`
- **CORS**: `FRONTEND_URL` must match the browser origin exactly
