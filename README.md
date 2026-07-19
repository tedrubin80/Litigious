# Litigious

**Open source legal practice management** for law firms, legal tech builders, and white-label resellers.

Manage cases, clients, documents, time, billing, and a secure client portal — with optional AI-assisted workflows and **migration from Clio, MyCase, and PracticePanther**.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![Live demo](https://img.shields.io/badge/demo-litigious.online-brightgreen)](https://litigious.online)

**[Live demo](https://litigious.online)** · **[User guide](docs/USER_GUIDE.md)** · **[Install](docs/INSTALL.md)** · **[Contributing](docs/CONTRIBUTING.md)**

---

## Table of contents

- [What is Litigious?](#what-is-litigious)
- [Who is it for?](#who-is-it-for)
- [Features](#features)
- [Live demo](#live-demo)
- [Quick start](#quick-start)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Migrating from another LMS](#migrating-from-another-lms)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [User roles](#user-roles)
- [Security](#security)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## What is Litigious?

Litigious is a **self-hostable legal management system (LMS)** — the kind of platform firms use for case tracking, client records, document storage, billable time, and client-facing portals.

It is released under the **AGPL-3.0 license**, so you can run it for your firm, fork it, customize it, or white-label it for clients without licensing fees to us — with the obligation to share source for network-deployed modifications.

**Built with:** React · Vite · Tailwind · Node.js · Express · PostgreSQL · Prisma · JWT · Socket.IO

---

## Who is it for?

| You are… | Litigious gives you… |
|----------|----------------------|
| **A law firm** | Case lifecycle, time tracking, documents, client portal, dashboards |
| **A legal tech consultant / reseller** | AGPL-3.0 codebase, modular features, deploy under your brand and domain |
| **A developer** | Documented install, Railway/Vercel/Docker configs, Prisma schema, REST API |
| **A firm switching LMS** | Import pipeline from Clio, MyCase, PracticePanther (API + CSV), always dry-run first |

---

## Features

### Case & client management

- Full case lifecycle: intake → active → settlement/close
- Case types, priorities, stages, deadlines, and status history
- Client records with contact info, notes, and linked matters
- Role-based access — attorneys, paralegals, and admins see what they should

### Documents

- Upload, organize, and preview files
- Access scoping so client portal users only see shared documents
- Optional ClamAV virus scanning on upload

### Time tracking & billing

- Billable time entries tied to cases and users
- Invoicing support with line items from time records
- Optional payment integrations (Stripe, Square, PayPal) when configured

### Client portal

- Separate login at `/client/login`
- Clients view their cases and shared documents
- Staff manage portal users from admin tools

### LMS migration (import)

- **Sources:** Clio, MyCase, PracticePanther + CSV exports
- **Entities:** contacts → clients, matters → cases, time entries
- **Safety:** every import runs as a **dry run** first; commit only after review
- Admin UI at **Admin → LMS Import**

See [docs/IMPORT_MIGRATION.md](docs/IMPORT_MIGRATION.md).

### AI (optional)

- Multi-provider document generation (OpenAI, Anthropic, Google, Cohere, local Ollama)
- Bring your own API keys — configured in **Admin → AI Provider Keys**
- Legal research integration (Lex Machina) when API credentials are set

### Collaboration & practice tools

- Task board with case-linked tasks
- Activity feed and dashboard charts
- WebRTC video meetings and Zoom integration hooks
- Medical records tracking (personal injury / workers’ comp workflows)
- Reports and analytics views

### Admin & security

- User management with granular roles
- Two-factor authentication (TOTP) for staff
- Rate limiting, CSRF protection, security headers
- Audit-friendly import mappings (`externalId` → internal ID)

---

## Live demo

Try the hosted instance (no install required):

| Portal | URL |
|--------|-----|
| **App** | [litigious.online](https://litigious.online) |
| **Staff login** | [litigious.online/admin/login](https://litigious.online/admin/login) |
| **Client login** | [litigious.online/client/login](https://litigious.online/client/login) |

Demo credentials (hosted instance and after `npm run seed:demo`):

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@litigious.online` | `DemoShow2026!` |
| Attorney | `attorney@litigious.online` | `DemoShow2026!` |
| Paralegal | `paralegal@litigious.online` | `DemoShow2026!` |
| Client portal | `client@litigious.online` | `DemoShow2026!` |

Staff use **Staff login**; clients use **Client portal**.

---

## Quick start

> **Demo by default:** `.env.example` enables demo UI and auto-reset. For a production firm, see **[docs/GOING_TO_PRODUCTION.md](docs/GOING_TO_PRODUCTION.md)**.

```bash
git clone https://github.com/tedrubin80/Litigious.git
cd Litigious
npm run setup
```

Edit `backend/.env` — set `DATABASE_URL`, `JWT_SECRET`, and `SESSION_SECRET` (see below).

```bash
npm run db:push
npm run dev          # API on :3001, app on :5173 — demo seed runs when API starts
```

Open **http://localhost:5173** and sign in with the demo admin account below (or wait ~5s after API start for auto-seed).

---

## Installation

### Requirements

- **Node.js** 18 or newer
- **PostgreSQL** 14 or newer
- **npm** 9+

### Step 1 — Clone and install

```bash
git clone https://github.com/tedrubin80/Litigious.git
cd Litigious
npm run setup
```

`npm run setup` installs dependencies in the root, `backend/`, and `frontend/`, and copies `.env.example` files if yours are missing.

### Step 2 — Configure the database

Create a PostgreSQL database, then set in `backend/.env`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/litigious
```

Generate secrets:

```bash
openssl rand -hex 32   # use for JWT_SECRET
openssl rand -hex 32   # use for SESSION_SECRET
```

### Step 3 — Apply schema

```bash
npm run db:push
```

### Step 4 — (Optional) Load demo data

```bash
npm run seed:demo
```

This resets users, clients, cases, and related records to a consistent showcase dataset. See [docs/DEMO_DATA.md](docs/DEMO_DATA.md).

### Step 5 — Run

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

### Production build

```bash
npm run build              # frontend → frontend/dist
npm run start:backend      # API
npm run start:frontend     # vite preview, or serve dist via nginx
```

Full details: **[docs/INSTALL.md](docs/INSTALL.md)**

---

## Environment variables

### Backend (`backend/.env`) — required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing key for auth tokens (32+ random bytes) |
| `SESSION_SECRET` | Express session secret |
| `FRONTEND_URL` | App origin for CORS (e.g. `http://localhost:5173`) |
| `ALLOWED_ORIGINS` | Comma-separated allowed browser origins |

### Backend — optional

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, … | AI features |
| `SMTP_*` | Transactional email |
| `CLAMAV_ENABLED` | Virus scan uploads |
| `SENTRY_DSN` | Error tracking |
| `ALLOW_PUBLIC_REGISTRATION` | Default `false` |

Copy from `backend/.env.example` for the full list.

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base (e.g. `/api` behind nginx, or `http://localhost:3001/api`) |
| `VITE_MARKETING_URL` | Link to your public marketing site (optional) |

---

## Deployment

Litigious is a **monorepo**: PostgreSQL + `backend/` + `frontend/`.

| Method | Best for | Guide |
|--------|----------|-------|
| **Railway** | Fast cloud deploy (Postgres + API + app) | [docs/DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md) |
| **Vercel** | Frontend static hosting (API elsewhere) | [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) |
| **Docker Compose** | Local or VPS full stack | [docs/INSTALL.md](docs/INSTALL.md) |
| **VPS + nginx** | Production self-host | [docs/STAGING_DEPLOY.md](docs/STAGING_DEPLOY.md) |

Config-as-code included:

- [`vercel.json`](vercel.json) — deploy **app** from repo root (Option B in deploy guide)
- `backend/railway.toml` — API build, healthcheck, Prisma migrate on deploy
- `frontend/railway.toml` — Vite build + static serve
- `frontend/vercel.json` — deploy app with Root Directory `frontend` (Option A)
- `website/vercel.json` — separate Vercel project for marketing
- `docker-compose.yml` — Postgres + API + web

To publish a **Railway template** for one-click deploys: deploy once, then **Generate Template from Project** — see [deploy/railway/TEMPLATE.md](deploy/railway/TEMPLATE.md).

### Marketing site (optional)

The [`website/`](website/) folder is a **separate static marketing page** (product overview, features, deploy links). Deploy it to Vercel or any static host — it is not part of the running app. The app itself shows a minimal login landing at `/`.

---

## Migrating from another LMS

Litigious includes a **source-agnostic import pipeline**:

1. Adapters fetch raw data from Clio, MyCase, or PracticePanther (OAuth API or CSV)
2. Records normalize to a canonical model (contacts, matters, time entries)
3. Validation and deduplication run before anything is written
4. **Dry run** shows preview counts and errors
5. **Commit** writes to your database with an audit trail of external IDs

Import order: **contacts → matters → time entries**.

Admin UI: **Admin → LMS Import** · API: `/api/import/*` (admin only)

Full guide: **[docs/IMPORT_MIGRATION.md](docs/IMPORT_MIGRATION.md)**

---

## Project structure

```
Litigious/
├── backend/                 # Express API
│   ├── prisma/              # Schema & migrations
│   ├── src/
│   │   ├── import/          # LMS migration adapters & pipeline
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   └── railway.toml
├── frontend/                # React (Vite) SPA
│   ├── src/components/      # UI by domain (Cases, Clients, Admin, …)
│   └── vercel.json
├── website/                 # Optional static marketing site
├── docs/                    # Guides (install, user, deploy, migration)
├── deploy/                  # Dockerfiles, Railway template notes
├── scripts/                 # Setup & test helpers
├── docker-compose.yml
├── LICENSE                  # AGPL-3.0
└── README.md                # You are here
```

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│  frontend/  │────▶│   backend/   │
│  (React)    │     │  Vite SPA   │ API │   Express    │
└─────────────┘     └─────────────┘     └──────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │  PostgreSQL  │
                                        │   (Prisma)   │
                                        └──────────────┘
```

- **Auth:** JWT in httpOnly cookies; optional 2FA for staff
- **Realtime:** Socket.IO for collaboration features
- **API:** REST under `/api`; OpenAPI docs at `/api-docs` in development
- **REST v1:** `/api/v1` with pagination and filtering

Tech details: **[docs/TECH_SPECS.md](docs/TECH_SPECS.md)**

---

## User roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full system, import, AI keys |
| `ADMIN` | User management, firm settings |
| `ATTORNEY` | Assigned cases, documents, time |
| `PARALEGAL` / `ASSISTANT` | Case support, tasks, documents |
| `CLIENT` | Portal only — own cases and shared docs |

End-user walkthrough: **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)**

---

## Security

- Secrets only via environment variables — never commit `.env`
- Rate limiting on authentication and API routes
- Role-based and case/client scoping on sensitive data
- CSRF protection for cookie-based flows
- Optional ClamAV scanning on document upload
- Import dry-run required before writing billing or client data

Report security issues privately to **ted@theorubin.com** rather than opening a public issue.

---

## Testing

```bash
npm run test:backend          # Jest unit & integration tests
npm run test:frontend           # React component tests
npm run test:ci                 # CI subset
```

Backend tests expect a configured `DATABASE_URL` in the test environment. CI runs on every push to `main`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [USER_GUIDE.md](docs/USER_GUIDE.md) | For firm staff and admins |
| [INSTALL.md](docs/INSTALL.md) | Developer install & troubleshooting |
| [TECH_SPECS.md](docs/TECH_SPECS.md) | Stack, API, security model |
| [IMPORT_MIGRATION.md](docs/IMPORT_MIGRATION.md) | Clio / MyCase / PracticePanther import |
| [DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md) | Railway monorepo deploy |
| [DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) | Vercel frontend deploy |
| [DEMO_DATA.md](docs/DEMO_DATA.md) | Demo seed contents |
| [GOING_TO_PRODUCTION.md](docs/GOING_TO_PRODUCTION.md) | Disable demo mode for a real firm |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute |
| [docs/README.md](docs/README.md) | Full doc index |

---

## Contributing

Contributions are welcome — bug fixes, docs, adapters for new LMS sources, and tests.

1. Fork the repository
2. Create a feature branch
3. Run tests locally
4. Open a pull request

By contributing, you agree your work is licensed under the [GNU Affero General Public License v3.0](LICENSE).

See **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)**.

---

## License

**GNU Affero General Public License v3.0** — Copyright (c) 2026 Ted Rubin.

Free to use, modify, and distribute under AGPL-3.0. Network use of modified versions requires offering the corresponding source. See [LICENSE](LICENSE).

---

## Contact & links

- **Repository:** [github.com/tedrubin80/Litigious](https://github.com/tedrubin80/Litigious)
- **Live demo:** [litigious.online](https://litigious.online)
- **Issues:** [GitHub Issues](https://github.com/tedrubin80/Litigious/issues)
- **Email:** ted@theorubin.com
