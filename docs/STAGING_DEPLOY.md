# Staging Deployment

Use a separate Railway (or VPS) service with its own PostgreSQL database.

## 1. Environment

Copy `backend/.env.staging.example` to your staging secrets manager and set:

- Unique `JWT_SECRET`, `SESSION_SECRET`, `PII_ENCRYPTION_KEY`, `BACKUP_PASSPHRASE`
- `DATABASE_URL` pointing at staging Postgres
- `FRONTEND_URL` / `ALLOWED_ORIGINS` = `https://staging.litigious.online`
- `FORCE_HTTPS=true`, `METRICS_ENABLED=true`, `CLAMAV_ENABLED=true` (if scanner available)

Frontend build vars:

```bash
VITE_API_URL=/api
```

## 2. Deploy steps

```bash
cd backend && npm ci && npx prisma migrate deploy
cd ../frontend && npm ci && npm run build
cd ../backend && npm start
```

Serve `frontend/build` via nginx or Railway static service; proxy `/api` to backend port.

## 3. Smoke checklist

- [ ] Staff login + 2FA
- [ ] Client password setup with verification code
- [ ] Dashboard stats load for attorney and client roles
- [ ] Document preview watermark
- [ ] `GET /metrics` with `x-metrics-token` header
- [ ] Manual backup script run

## 4. Monitoring

- Prometheus scrape: `https://staging.litigious.online/metrics`
- Optional: set `SENTRY_DSN` and install `@sentry/node` on backend
