# Branding & white-label

Litigious reads display name and links from environment variables so a fork or white-label repo can rebrand without code changes.

## Frontend (`frontend/.env.local`)

| Variable | Default | Used for |
|----------|---------|----------|
| `VITE_APP_NAME` | `Litigious` | Login wordmark, sidebar, page titles |
| `VITE_APP_TAGLINE` | `Legal Practice Management` | Login subtitle |
| `VITE_MARKETING_URL` | Litigiousweb URL | App landing “About” link |
| `VITE_DOCS_URL` | GitHub install doc | Self-host help link |

Central config: [`frontend/src/config/brand.js`](../frontend/src/config/brand.js)  
Login wordmark component: [`frontend/src/components/Brand/BrandWordmark.js`](../frontend/src/components/Brand/BrandWordmark.js)

## Backend (`backend/.env`)

| Variable | Default | Used for |
|----------|---------|----------|
| `APP_NAME` | `Litigious` | Emails, server logs, seed copy |
| `MAIL_FROM_ADDRESS` | `noreply@litigious.online` | With `APP_NAME` → `"Litigious <noreply@...>"` |
| `SMTP_FROM` | — | Full override, e.g. `"Acme Law <noreply@acme.com>"` |
| `FROM_EMAIL` | — | Alias for `SMTP_FROM` |

Central config: [`backend/src/lib/brand.js`](../backend/src/lib/brand.js)

## White-label repo strategy

1. Keep public **Litigious** as the upstream core  
2. Private repo sets env vars + replaces `website/` marketing assets  
3. Optional: override CSS variables in one theme file later  

See root [README](../README.md) for the two-homepage layout (`website/` vs app `/`).
