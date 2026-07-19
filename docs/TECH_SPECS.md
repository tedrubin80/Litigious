# Technical specifications

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js 18+, Express 4 |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (httpOnly cookies), optional 2FA (TOTP) |
| Realtime | Socket.IO |
| Tests | Jest, Supertest |

## Architecture

```
Browser
   │
   ├── website/          (static marketing — optional separate host)
   │
   └── frontend/         React SPA
           │  /api/* proxy or VITE_API_URL
           ▼
       backend/          Express REST + WebSocket
           │
           ▼
       PostgreSQL
```

## Core domains

- **Users & roles**: SUPER_ADMIN, ADMIN, ATTORNEY, PARALEGAL, ASSISTANT, CLIENT
- **Clients & cases**: Full lifecycle, status history, deadlines
- **Documents**: Upload, access scoping, optional ClamAV scan
- **Time & billing**: Time entries, invoices, payment integrations (optional)
- **Import**: Canonical adapter pipeline (Clio, MyCase, PracticePanther, CSV)

## API

- Base path: `/api`
- OpenAPI/Swagger: `/api-docs` (non-production)
- REST v1: `/api/v1`
- Health: `GET /api/health`

## Security defaults

- Rate limiting on auth and API routes
- CSRF for non-Bearer cookie flows
- Role-based access + case/client scoping
- Secrets via environment variables only

## Node packages

- Root: workspace scripts (`npm run dev`, `setup`, `db:push`)
- `backend/package.json`: API server
- `frontend/package.json`: Vite app

## License

AGPL-3.0 — see [LICENSE](../LICENSE).
