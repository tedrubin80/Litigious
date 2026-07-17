# Railway Deployment Guide - Legal Estate Demo

This guide will walk you through deploying the Legal Estate Demo application to Railway.

## 🚀 Quick Start

### Prerequisites
- Railway account (https://railway.app)
- GitHub account
- Code pushed to GitHub repository

---

## 📋 Deployment Steps

### 1. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `tedrubin80/Litigious`

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. Copy the `DATABASE_URL` connection string

### 3. Deploy Backend Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Railway will auto-detect Node.js
4. Configure the service:
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`
   - **Healthcheck Path**: `/api/health`

#### Backend Environment Variables

Click on the backend service → "Variables" tab and add:

```bash
# Required Variables
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3001

# JWT & Session (Generate secure random strings)
JWT_SECRET=<generate-secure-random-string>
SESSION_SECRET=<generate-secure-random-string>

# Frontend URL (Will be your Railway frontend URL)
FRONTEND_URL=https://your-frontend-url.railway.app
HTTP_FALLBACK_URL=https://your-frontend-url.railway.app

# Demo Mode Settings
PACKAGE_TYPE=demo
DEMO_MODE=true
DEMO_RESET_INTERVAL=24
DEMO_RESET_TIME=03:00

# Demo Limitations
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

# Optional: AI Provider Keys (for AI features)
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# GOOGLE_API_KEY=your-key-here
# COHERE_API_KEY=your-key-here

# Optional: Payment Processing (if needed)
# STRIPE_SECRET_KEY=sk_test_your-key
# PAYPAL_CLIENT_ID=your-client-id
# PAYPAL_CLIENT_SECRET=your-client-secret
```

### 4. Deploy Frontend Service

1. Click "New" → "GitHub Repo"
2. Select the same repository
3. Configure the service:
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l $PORT`

#### Frontend Environment Variables

```bash
# Backend API URL (Will be your Railway backend URL)
REACT_APP_API_URL=https://your-backend-url.railway.app/api

# Demo Mode Settings
REACT_APP_PACKAGE_TYPE=demo
REACT_APP_VERSION=1.0.0-demo
REACT_APP_DEMO_MODE=true
REACT_APP_DEMO_RESET_TIME=03:00 UTC
REACT_APP_DEMO_BANNER=true

# Demo Credentials Display
REACT_APP_DEMO_ADMIN_EMAIL=demo@litigious.online
REACT_APP_DEMO_ADMIN_PASSWORD=demo123
REACT_APP_DEMO_USER_EMAIL=user@litigious.online
REACT_APP_DEMO_USER_PASSWORD=user123

# Demo Limitations Display
REACT_APP_MAX_USERS=10
REACT_APP_MAX_CASES=50
REACT_APP_MAX_DOCUMENTS=10
REACT_APP_SESSION_TIMEOUT=3600

# Demo Features
REACT_APP_SHOW_DEMO_CREDENTIALS=true
REACT_APP_DISABLE_REGISTRATION=false
REACT_APP_SHOW_RESET_WARNING=true
REACT_APP_WATERMARK_TEXT=DEMO VERSION
REACT_APP_SHOW_DEMO_HINTS=true

# Demo Contact
REACT_APP_DEMO_SUPPORT_EMAIL=support@litigious.online
REACT_APP_DEMO_CONTACT_MESSAGE=Questions? Contact us for a full version demo!
```

### 5. Run Database Migrations

After backend is deployed:

1. Go to backend service in Railway
2. Click on "Deployments" tab
3. Find the latest deployment
4. Click the three dots → "View Logs"
5. Prisma migrations should run automatically on first deploy

If migrations don't run automatically, you can run them manually:
1. Click "Settings" → "Service"
2. Add a "Deploy Command": `npx prisma migrate deploy`

### 6. Update CORS URLs

After both services are deployed:

1. Copy the frontend URL from Railway (e.g., `https://your-app.railway.app`)
2. Go to backend service variables
3. Update `FRONTEND_URL` and `HTTP_FALLBACK_URL` with the actual frontend URL
4. Redeploy the backend service

---

## 🔐 Generating Secure Secrets

For `JWT_SECRET` and `SESSION_SECRET`, generate secure random strings:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 64

# Option 3: Online generator (use a reputable source)
# https://generate-secret.vercel.app/64
```

---

## 🗄️ Database Setup

Railway's PostgreSQL will automatically:
- Create an empty database
- Provide a connection string
- Set up automatic backups

Prisma will:
- Run migrations on first deploy
- Create all necessary tables
- Set up demo data (if configured)

---

## 📊 Monitoring & Logs

### View Logs
1. Click on service (backend or frontend)
2. Click "Deployments" tab
3. Select a deployment
4. View real-time logs

### Health Checks
- **Backend Health**: `https://your-backend-url.railway.app/api/health`
- **Backend Status**: `https://your-backend-url.railway.app/api/status`
- **Frontend**: Access the frontend URL directly

---

## 🔄 CI/CD Automatic Deployments

Railway automatically:
- Deploys on every push to `main` branch
- Runs build commands
- Restarts services on successful build
- Rolls back on failure

To disable auto-deploy:
1. Go to service settings
2. Scroll to "Deploy Triggers"
3. Toggle off "Automatic Deployments"

---

## 💰 Cost Estimation

Railway Pricing (as of 2024):
- **Starter Plan**: $5/month (includes $5 credit)
- **Developer Plan**: $20/month
- Resources are billed hourly based on:
  - CPU usage
  - RAM usage
  - Network egress

**Estimated costs for this app:**
- PostgreSQL: ~$2-5/month
- Backend Service: ~$3-7/month
- Frontend Service: ~$2-5/month
- **Total**: ~$7-17/month (fits in $20 Developer plan)

---

## 🐛 Troubleshooting

### Backend Won't Start
1. Check environment variables are set
2. Verify `DATABASE_URL` is correct
3. Check logs for Prisma migration errors
4. Ensure Node.js version is 18+ (Railway auto-detects)

### Frontend 404 Errors
1. Verify `REACT_APP_API_URL` points to backend
2. Check CORS settings in backend
3. Ensure build completed successfully
4. Check serve is installed (added to package.json)

### Database Connection Errors
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` format
3. Ensure database migrations ran
4. Check Railway PostgreSQL logs

### CORS Errors
1. Update backend `FRONTEND_URL` variable
2. Ensure both HTTP and HTTPS are allowed (if needed)
3. Redeploy backend after updating

---

## 🔒 Security Checklist

- ✅ `.env` files are in `.gitignore`
- ✅ `PRODUCTION_CREDENTIALS.md` is excluded from Git
- ✅ Generate unique JWT_SECRET and SESSION_SECRET
- ✅ Use Railway's environment variables (not hardcoded)
- ✅ Enable Railway's built-in SSL/TLS
- ✅ Set `NODE_ENV=production`
- ✅ Review and limit CORS origins in production

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Templates](https://railway.app/templates)
- [Prisma Railway Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway)
- [Node.js on Railway](https://docs.railway.app/guides/nodejs)

---

## 🆘 Support

If you encounter issues:
1. Check Railway status page: https://status.railway.app
2. Review deployment logs in Railway dashboard
3. Check GitHub repository issues
4. Railway Discord: https://discord.gg/railway

---

**Last Updated**: October 2024
**Version**: 1.0.0
**Status**: Production Ready
