# GitHub & Railway Deployment Checklist

This document provides a step-by-step checklist for deploying the Legal Estate Demo to GitHub and Railway.

## ✅ Pre-Deployment Verification

### Security & Sensitive Data
- [x] `.gitignore` file renamed and configured
- [x] `PRODUCTION_CREDENTIALS.md` excluded from git
- [x] `.env` files excluded (only `.env.example` included)
- [x] `backups/` directory excluded
- [x] `database-backup/` directory excluded
- [x] Build artifacts (`build/`, `static/`, `coverage/`) excluded
- [ ] **ACTION REQUIRED**: Verify no real API keys in codebase

### Configuration Files
- [x] `.env.example` exists for backend (backend/.env.example:1)
- [ ] **ACTION REQUIRED**: Create `.env.example` for frontend (or use existing .env.demo as reference)
- [x] Railway configuration files created:
  - railway.json (root)
  - backend/railway.toml
  - frontend/railway.toml

### Dependencies
- [x] Backend package.json configured with Node.js 18+ requirement
- [x] Frontend package.json updated with `serve` dependency
- [x] All dependencies are production-ready
- [x] Test scripts properly configured

### Database
- [x] Prisma schema configured (backend/prisma/schema.prisma:1)
- [x] Migrations exist (backend/prisma/migrations/)
- [x] Database URL uses environment variable
- [ ] **ACTION REQUIRED**: Ensure you have PostgreSQL on Railway

### Documentation
- [x] README.md exists with project overview
- [x] RAILWAY_DEPLOYMENT.md created with deployment instructions
- [x] Environment variables documented

---

## 🚀 GitHub Push Steps

### 1. Review What Will Be Committed

```bash
cd /var/www/legal
git status
git add -n .  # Dry run to see what will be added
```

**Verify that these files are NOT being added:**
- `PRODUCTION_CREDENTIALS.md`
- `backend/.env`
- `frontend/.env`
- `backups/`
- `database-backup/`
- `node_modules/`
- `build/` directories

### 2. Stage All Files

```bash
git add .
```

### 3. Review Staged Files

```bash
git status
```

### 4. Create Initial Commit

```bash
git commit -m "Initial commit: Legal Estate Demo

- Complete React.js frontend with demo mode
- Node.js/Express backend with Prisma ORM
- PostgreSQL database schema and migrations
- AI integration (OpenAI, Anthropic, Google, Cohere)
- Railway deployment configuration
- Comprehensive documentation

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 5. Add Remote Repository

```bash
git remote add origin https://github.com/tedrubin80/LegalEstateDemo.git
```

### 6. Rename Branch to 'main'

```bash
git branch -M main
```

### 7. Push to GitHub

```bash
git push -u origin main
```

If the repository already has content:
```bash
git push -u origin main --force  # Only if you're sure you want to overwrite
```

Or to merge with existing content:
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 🚂 Railway Deployment Steps

### Step 1: Create New Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select `tedrubin80/LegalEstateDemo`

### Step 2: Add PostgreSQL Database

1. In Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway creates database and provides `DATABASE_URL`
4. Note: Copy the connection string for reference (though Railway handles this automatically via variables)

### Step 3: Deploy Backend

1. Railway should auto-detect the backend
2. If not, click "+ New" → "GitHub Repo" → Select repo
3. Configure service settings:
   - **Name**: `legal-estate-backend`
   - **Root Directory**: `backend`
   - Click "Settings" → "Environment"

#### Backend Environment Variables

Add these variables (click "RAW Editor" for bulk paste):

```bash
# Database (automatically linked)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Server Configuration
NODE_ENV=production
PORT=3001

# Security - GENERATE NEW SECRETS!
JWT_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_64_CHARS
SESSION_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_64_CHARS

# Frontend URL (update after frontend is deployed)
FRONTEND_URL=https://REPLACE_WITH_FRONTEND_URL.railway.app
HTTP_FALLBACK_URL=https://REPLACE_WITH_FRONTEND_URL.railway.app

# Demo Mode
PACKAGE_TYPE=demo
DEMO_MODE=true
DEMO_RESET_INTERVAL=24
DEMO_RESET_TIME=03:00

# Limits
MAX_USERS=10
MAX_CASES=50
MAX_DOCUMENTS_PER_CASE=10
MAX_FILE_SIZE=10MB
DEMO_SESSION_TIMEOUT=3600

# Demo Credentials
DEMO_ADMIN_EMAIL=demo@litigious.online
DEMO_ADMIN_PASSWORD=demo123
DEMO_USER_EMAIL=user@litigious.online
DEMO_USER_PASSWORD=user123

# Activity Tracking
DEFAULT_HOURLY_RATE=150.00
ACTIVITY_TRACKING_ENABLED=true
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Deploy Frontend

1. Click "+ New" → "GitHub Repo" → Select same repo
2. Configure service:
   - **Name**: `legal-estate-frontend`
   - **Root Directory**: `frontend`

#### Frontend Environment Variables

```bash
# Backend URL (update with actual backend Railway URL)
REACT_APP_API_URL=https://REPLACE_WITH_BACKEND_URL.railway.app/api

# Demo Configuration
REACT_APP_PACKAGE_TYPE=demo
REACT_APP_VERSION=1.0.0-demo
REACT_APP_DEMO_MODE=true
REACT_APP_DEMO_RESET_TIME=03:00 UTC
REACT_APP_DEMO_BANNER=true

# Demo Credentials
REACT_APP_DEMO_ADMIN_EMAIL=demo@litigious.online
REACT_APP_DEMO_ADMIN_PASSWORD=demo123
REACT_APP_DEMO_USER_EMAIL=user@litigious.online
REACT_APP_DEMO_USER_PASSWORD=user123

# Limits
REACT_APP_MAX_USERS=10
REACT_APP_MAX_CASES=50
REACT_APP_MAX_DOCUMENTS=10
REACT_APP_SESSION_TIMEOUT=3600

# Features
REACT_APP_SHOW_DEMO_CREDENTIALS=true
REACT_APP_DISABLE_REGISTRATION=false
REACT_APP_SHOW_RESET_WARNING=true
REACT_APP_WATERMARK_TEXT=DEMO VERSION
REACT_APP_SHOW_DEMO_HINTS=true
REACT_APP_DEMO_SUPPORT_EMAIL=support@litigious.online
REACT_APP_DEMO_CONTACT_MESSAGE=Questions? Contact us for a full version demo!
```

### Step 5: Update URLs After Deployment

Once both services are deployed:

1. **Copy Backend URL** from Railway (e.g., `https://legal-estate-backend-production.up.railway.app`)
2. **Go to Frontend service** → Variables
3. **Update** `REACT_APP_API_URL` to: `https://YOUR_BACKEND_URL/api`
4. **Redeploy frontend**

5. **Copy Frontend URL** from Railway
6. **Go to Backend service** → Variables
7. **Update**:
   - `FRONTEND_URL=https://YOUR_FRONTEND_URL`
   - `HTTP_FALLBACK_URL=https://YOUR_FRONTEND_URL`
8. **Redeploy backend**

### Step 6: Verify Deployment

1. **Check Backend Health**:
   - Visit: `https://your-backend-url.railway.app/api/health`
   - Should return: `{"status":"ok"}`

2. **Check Frontend**:
   - Visit: `https://your-frontend-url.railway.app`
   - Should show login page with demo credentials

3. **Test Login**:
   - Use: `demo@litigious.online` / `demo123`
   - Should successfully log in

### Step 7: View Logs

- Click on each service in Railway
- Click "Deployments" tab
- Select latest deployment
- View logs for any errors

---

## 🔍 Verification Checklist

### GitHub Repository
- [ ] Code successfully pushed to GitHub
- [ ] `PRODUCTION_CREDENTIALS.md` is NOT in the repository
- [ ] `.env` files are NOT in the repository
- [ ] `.env.example` files ARE in the repository
- [ ] README.md displays correctly
- [ ] All documentation files are present

### Railway Backend
- [ ] Service deployed successfully
- [ ] PostgreSQL database connected
- [ ] All environment variables set
- [ ] Health check endpoint responds: `/api/health`
- [ ] Logs show "Server running on port 3001"
- [ ] Prisma migrations completed

### Railway Frontend
- [ ] Service deployed successfully
- [ ] Build completed without errors
- [ ] Environment variables set
- [ ] Frontend accessible via URL
- [ ] Can see login page
- [ ] Demo credentials display correctly

### Integration Testing
- [ ] Frontend can connect to backend
- [ ] Login works with demo credentials
- [ ] Dashboard loads after login
- [ ] Demo banner displays
- [ ] Demo limitations visible
- [ ] Virtual tour works

---

## 🐛 Common Issues & Solutions

### Issue: CORS Errors
**Solution**:
- Verify `FRONTEND_URL` in backend matches actual frontend URL
- Ensure both URLs include `https://` protocol
- Redeploy backend after updating

### Issue: "Cannot connect to backend"
**Solution**:
- Check `REACT_APP_API_URL` in frontend
- Verify backend is running (check health endpoint)
- Ensure `/api` is included in the URL

### Issue: Database connection failed
**Solution**:
- Verify PostgreSQL service is running
- Check `DATABASE_URL` is linked: `${{Postgres.DATABASE_URL}}`
- Run migrations manually if needed

### Issue: Frontend shows blank page
**Solution**:
- Check browser console for errors
- Verify build completed successfully in Railway logs
- Check that `serve` package is installed
- Verify start command: `npx serve -s build -l $PORT`

### Issue: 404 on all API routes
**Solution**:
- Backend may not be listening on correct PORT
- Check backend logs for startup errors
- Verify PORT variable is set (Railway provides this)

---

## 📊 Post-Deployment Tasks

### Monitoring
- [ ] Set up Railway alerts for downtime
- [ ] Monitor resource usage (CPU/RAM)
- [ ] Check logs periodically for errors

### Custom Domain (Optional)
1. Go to Railway service → Settings
2. Click "Domains"
3. Add custom domain
4. Update DNS records as instructed
5. Update environment variables with new domain

### Database Backups
Railway automatically backs up PostgreSQL, but you can also:
1. Download manual backups periodically
2. Set up automated backup scripts
3. Export database via Railway CLI

---

## 💡 Tips for Success

1. **Always use Railway's environment variables** - Never hardcode secrets
2. **Test locally first** - Use Docker Compose to test before deploying
3. **Monitor costs** - Check Railway dashboard for usage
4. **Use Railway CLI** - Install for easier management: `npm i -g @railway/cli`
5. **Enable auto-deploy** - Railway deploys automatically on git push
6. **Review logs regularly** - Catch issues early

---

## 📚 Quick Reference

### Railway URLs (Update after deployment)
- Backend: `https://______.railway.app`
- Frontend: `https://______.railway.app`
- Database: (Internal, managed by Railway)

### Demo Credentials
- Admin: `demo@litigious.online` / `demo123`
- User: `user@litigious.online` / `user123`

### Health Endpoints
- Backend Health: `/api/health`
- Backend Status: `/api/status`
- API Docs: `/api-docs` (Swagger)

---

## ✅ Final Checklist

Before announcing your demo:
- [ ] GitHub repository is public (if intended) and accessible
- [ ] Railway services are running and accessible
- [ ] Demo credentials work
- [ ] All features are functional
- [ ] Virtual tour works properly
- [ ] Demo banner displays
- [ ] Contact information is correct
- [ ] Documentation is complete

---

**Deployment Status**: Ready for GitHub and Railway ✅

**Last Updated**: October 2024
**Prepared by**: Claude Code
**Project**: Legal Estate Demo - Virtual Tour Version
