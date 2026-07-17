# Deploy on Vercel

Vercel fits two parts of Litigious:

| Project | Folder | Type |
|---------|--------|------|
| Marketing site | `website/` | Static HTML |
| Frontend app | `frontend/` | Vite SPA (API on Railway/other) |

The **backend must run elsewhere** (Railway, VPS, Docker) — Vercel hosts static/edge frontends only.

## Marketing site (`website/`)

1. Vercel → **Add New Project** → import repo
2. **Root Directory**: `website`
3. Framework: **Other** (static)
4. Build command: *(leave empty)*
5. Output: `.` or leave default

`website/vercel.json` is included for headers and routing.

Custom domain example: `litigious.dev` → marketing  
Demo link in site points to your hosted app.

## Frontend app (`frontend/`)

1. **Root Directory**: `frontend`
2. Framework: **Vite**
3. Build: `npm run build`
4. Output: `dist`
5. Environment:

```bash
VITE_API_URL=https://your-api.example.com/api
VITE_MARKETING_URL=https://your-marketing.example.com
```

6. Rewrites (in `frontend/vercel.json`): SPA fallback to `index.html`

### API proxy (optional)

For same-origin `/api`, use Vercel rewrites to your Railway backend — see `frontend/vercel.json` comments.

## Recommended DNS layout

```
www.example.com     →  website/   (Vercel project 1)
app.example.com     →  frontend/  (Vercel project 2)
api.example.com     →  backend/   (Railway)
```

## Related

- [INSTALL.md](INSTALL.md)
- [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)
