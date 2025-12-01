# Deployment Guide

Complete guide for deploying QuotePro to production.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment](#backend-deployment)
- [Database Migrations](#database-migrations)
- [CI/CD Pipeline](#cicd-pipeline)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

QuotePro deployment architecture:
- **Frontend:** Next.js → Vercel (auto-deploy from main branch)
- **Backend:** Python/FastAPI → Railway/Render/Docker (your choice)
- **Database:** Supabase (managed PostgreSQL with pgvector)
- **CI/CD:** GitHub Actions (test, build, deploy, health check)

**Deployment Flow:**
```
Push to main → Run tests → Deploy frontend → Deploy backend → Run migrations → Health checks → Success/Rollback
```

---

## Prerequisites

### 1. Accounts & Services
- [x] GitHub account (repository access)
- [x] Vercel account (frontend hosting)
- [ ] Railway/Render account (backend hosting - choose one)
- [x] Supabase account (database)
- [ ] Docker Hub account (optional, for Docker deployment)

### 2. Required Secrets
Collect these values before starting:

**From Supabase Dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin)
- `SUPABASE_JWT_SECRET` - JWT secret (Settings → API)
- `SUPABASE_ACCESS_TOKEN` - Personal access token (for CLI)
- `SUPABASE_DB_URL` - Direct database URL (Settings → Database)

**From Gemini AI:**
- `GEMINI_API_KEY` - Google AI API key

**From Vercel:**
- `VERCEL_TOKEN` - Vercel personal access token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID

**From Backend Hosting (Railway example):**
- `RAILWAY_TOKEN` - Railway API token

**Application URLs (after first deploy):**
- `FRONTEND_URL` - Your Vercel app URL
- `BACKEND_URL` - Your Railway/Render app URL

### 3. Tools
Install on your local machine:
```bash
# Vercel CLI
npm install -g vercel

# Supabase CLI
brew install supabase/tap/supabase

# Railway CLI (if using Railway)
npm install -g @railway/cli

# Docker (if using Docker)
brew install docker
```

---

## Environment Setup

### 1. Configure GitHub Secrets
Navigate to your GitHub repository → Settings → Secrets and variables → Actions

Add **Repository Secrets:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-here
SUPABASE_ACCESS_TOKEN=sbp_your_access_token
SUPABASE_DB_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
GEMINI_API_KEY=AIzaSy...
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=team_abc123
VERCEL_PROJECT_ID=prj_abc123
RAILWAY_TOKEN=your_railway_token
FRONTEND_URL=https://quotepro.vercel.app
BACKEND_URL=https://quotepro-backend.railway.app
```

### 2. Configure Environments
GitHub supports multiple environments (production, staging).

**Create Environments:**
1. Go to Settings → Environments
2. Click "New environment"
3. Create "production" and "staging"
4. Add environment-specific secrets if needed

**Environment Protection Rules:**
- ✅ Required reviewers (for production)
- ✅ Wait timer (optional delay before deploy)
- ✅ Deployment branches (main only for production)

---

## Frontend Deployment (Vercel)

### Option A: Automatic Deployment (Recommended)

**1. Connect GitHub to Vercel:**
```bash
# Login to Vercel
vercel login

# Link your project
cd /path/to/quotepro
vercel link
```

**2. Configure Vercel Project:**
- Framework: Next.js
- Root Directory: `./` (repository root)
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**3. Add Environment Variables in Vercel:**
Navigate to Vercel Dashboard → Your Project → Settings → Environment Variables

Add for **Production:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
PYTHON_BACKEND_URL=https://quotepro-backend.railway.app
```

**4. Deploy:**
Every push to `main` branch will auto-deploy to production.

### Option B: Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Verify Deployment
```bash
# Check frontend health
curl https://quotepro.vercel.app

# Expected: Next.js homepage loads
```

---

## Backend Deployment

### Option A: Railway (Recommended)

**1. Create Railway Project:**
```bash
# Login
railway login

# Create new project
railway init

# Link to GitHub repo
railway link
```

**2. Configure Railway:**

Create `railway.json` in `python-backend/`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create `Procfile` in `python-backend/`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**3. Add Environment Variables:**
```bash
# Set variables via CLI
railway variables set GEMINI_API_KEY=AIzaSy...
railway variables set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
railway variables set SUPABASE_JWT_SECRET=your-secret
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
railway variables set ALLOWED_ORIGINS=https://quotepro.vercel.app
railway variables set JSON_LOGS=true
railway variables set LOG_LEVEL=INFO
```

**4. Deploy:**
```bash
# Deploy from local
railway up

# Or push to GitHub (auto-deploys if connected)
git push origin main
```

**5. Get Backend URL:**
```bash
railway domain
# Output: quotepro-backend.railway.app
```

### Option B: Render

**1. Create Web Service:**
- Go to Render Dashboard → New → Web Service
- Connect GitHub repository
- Name: `quotepro-backend`
- Root Directory: `python-backend`
- Environment: Python 3.11
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**2. Add Environment Variables:**
Same as Railway (via Render dashboard)

**3. Set Health Check:**
- Path: `/api/health`
- Timeout: 30 seconds

**4. Deploy:**
Render auto-deploys on push to main.

### Option C: Docker (Self-hosted)

**1. Create Dockerfile:**

`python-backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**2. Build and push:**
```bash
# Build image
docker build -t quotepro-backend python-backend/

# Tag for Docker Hub
docker tag quotepro-backend yourusername/quotepro-backend:latest

# Push to Docker Hub
docker push yourusername/quotepro-backend:latest
```

**3. Deploy to server:**
```bash
# On your server
docker pull yourusername/quotepro-backend:latest

docker run -d \
  --name quotepro-backend \
  -p 8000:8000 \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  -e SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
  -e SUPABASE_JWT_SECRET=$SUPABASE_JWT_SECRET \
  -e NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
  -e ALLOWED_ORIGINS=https://quotepro.vercel.app \
  -e JSON_LOGS=true \
  -e LOG_LEVEL=INFO \
  --restart unless-stopped \
  yourusername/quotepro-backend:latest
```

### Verify Backend Deployment
```bash
# Check health
curl https://quotepro-backend.railway.app/api/health

# Expected:
# {"status": "healthy", "timestamp": "...", "uptime_seconds": 123}

# Check detailed health
curl https://quotepro-backend.railway.app/api/health/detailed

# Test authentication (should return 401)
curl -X POST https://quotepro-backend.railway.app/api/generate-quote \
  -H "Content-Type: application/json" \
  -d '{"job_description": "test"}'

# Expected: 401 Unauthorized (auth working!)
```

---

## Database Migrations

### 1. Setup Supabase CLI
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Login if needed
supabase login
```

### 2. Run Migrations
```bash
# Push all migrations to production
supabase db push

# Or run specific migration
supabase db push --include-all --dry-run  # Preview
supabase db push --include-all  # Execute
```

### 3. Verify Migrations
```bash
# Check migration status
supabase migration list

# Connect to database
supabase db remote get

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### 4. Automated Migrations (CI/CD)
Migrations run automatically via GitHub Actions on deploy.

Check `.github/workflows/deploy.yml` → `migrate-database` job.

---

## CI/CD Pipeline

### GitHub Actions Workflows

**1. Test Workflow** (`.github/workflows/test.yml`)
- **Trigger:** Push to main/develop, pull requests
- **Jobs:**
  - Frontend tests (type check, lint, build)
  - Backend tests (pytest, coverage)
  - Security scan (Trivy, Safety)
- **Duration:** ~5-10 minutes

**2. Deploy Workflow** (`.github/workflows/deploy.yml`)
- **Trigger:** Push to main, manual workflow dispatch
- **Jobs:**
  1. Run tests (calls test workflow)
  2. Deploy frontend (Vercel)
  3. Deploy backend (Railway/Render)
  4. Run database migrations (Supabase)
  5. Health checks (frontend, backend, smoke tests)
  6. Rollback on failure (creates issue)
- **Duration:** ~10-15 minutes

### Workflow Diagram
```
┌──────────────────────────────────────────────────┐
│              Push to main branch                  │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  Test Workflow                                  │
│  ├── Frontend: type-check, lint, build         │
│  ├── Backend: pytest, coverage                 │
│  └── Security: Trivy, Safety                   │
└────────────┬───────────────────────────────────┘
             │ (Pass)
             ▼
┌────────────────────────────────────────────────┐
│  Deploy Frontend (Vercel)                      │
│  └── Auto-deploy with env vars                │
└────────────┬───────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│  Deploy Backend (Railway/Render)               │
│  └── Build, push, start server                │
└────────────┬───────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│  Run Database Migrations (Supabase)            │
│  └── supabase db push                         │
└────────────┬───────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────┐
│  Health Checks                                 │
│  ├── Frontend: HTTP 200                       │
│  ├── Backend: /api/health                     │
│  └── Smoke tests: AI endpoint protected       │
└────────────┬───────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼ (Pass)          ▼ (Fail)
┌─────────┐     ┌──────────────┐
│ Success │     │   Rollback   │
│ Notify  │     │ Create Issue │
└─────────┘     └──────────────┘
```

### Manual Deployment
```bash
# Trigger deploy workflow manually
gh workflow run deploy.yml

# With environment selection
gh workflow run deploy.yml -f environment=staging
```

---

## Rollback Procedures

### Scenario 1: Frontend Rollback (Vercel)

**Automatic (Vercel Dashboard):**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

**Via CLI:**
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

**Via Git:**
```bash
# Revert last commit
git revert HEAD
git push origin main

# Vercel auto-deploys the revert
```

### Scenario 2: Backend Rollback (Railway)

**Via Railway Dashboard:**
1. Go to Railway Dashboard → Your Project → Deployments
2. Click on previous working deployment
3. Click "Redeploy"

**Via CLI:**
```bash
# Redeploy previous version
railway redeploy

# Or rollback to specific deployment
railway rollback <deployment-id>
```

**Via Docker:**
```bash
# Pull previous image version
docker pull yourusername/quotepro-backend:previous-sha

# Stop current container
docker stop quotepro-backend

# Start previous version
docker run -d --name quotepro-backend-rollback \
  -p 8000:8000 \
  [... same env vars ...] \
  yourusername/quotepro-backend:previous-sha
```

### Scenario 3: Database Rollback (Supabase)

**Warning:** Database rollbacks are dangerous! Always backup first.

**Option A: Revert Migration (if safe):**
```bash
# Create down migration
supabase migration new revert_feature_x

# Edit migration to undo changes
# Then push
supabase db push
```

**Option B: Point-in-Time Recovery (Supabase Dashboard):**
1. Go to Supabase Dashboard → Database → Backups
2. Select backup point before issue
3. Restore (creates new database)
4. Update connection strings

**Option C: Manual SQL Rollback:**
```sql
-- Example: Undo adding column
ALTER TABLE quotes DROP COLUMN new_column;

-- Example: Restore data from backup
INSERT INTO quotes SELECT * FROM quotes_backup WHERE id NOT IN (SELECT id FROM quotes);
```

### Emergency Rollback Checklist
1. [ ] Identify which component failed (frontend/backend/database)
2. [ ] Check health endpoint logs
3. [ ] Review recent deployments/commits
4. [ ] Communicate to team (Slack/email)
5. [ ] Execute rollback (see above)
6. [ ] Verify health checks pass
7. [ ] Monitor for 10 minutes
8. [ ] Create postmortem issue
9. [ ] Fix issue in separate branch
10. [ ] Re-deploy when ready

---

## Troubleshooting

### Issue: Frontend build fails on Vercel

**Symptoms:**
```
Error: Type error in src/app/page.tsx
Build failed
```

**Solutions:**
```bash
# 1. Test build locally
npm run build

# 2. Check TypeScript errors
npm run type-check

# 3. Check environment variables
# Ensure all NEXT_PUBLIC_* vars are set in Vercel

# 4. Check Node.js version
# Vercel should use Node 20+ (check vercel.json)
```

### Issue: Backend deployment fails

**Symptoms:**
```
Application failed to start
Health check timeout
```

**Solutions:**
```bash
# 1. Check logs
railway logs  # or render logs

# 2. Verify environment variables
railway variables  # ensure all set

# 3. Test locally with production settings
cd python-backend
export JSON_LOGS=true
export LOG_LEVEL=INFO
uvicorn main:app --host 0.0.0.0 --port 8000

# 4. Check health endpoint
curl http://localhost:8000/api/health
```

### Issue: Database migrations fail

**Symptoms:**
```
Error: relation "new_table" already exists
Migration failed
```

**Solutions:**
```bash
# 1. Check migration status
supabase migration list

# 2. Check database state
supabase db remote get
psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"

# 3. Reset migrations (DANGEROUS - staging only!)
supabase db reset

# 4. Manual fix
psql $DATABASE_URL
DROP TABLE IF EXISTS new_table CASCADE;
# Then retry migration
```

### Issue: Health checks fail after deployment

**Symptoms:**
```
❌ Backend health check failed (HTTP 500)
```

**Solutions:**
```bash
# 1. Check detailed health endpoint
curl https://quotepro-backend.railway.app/api/health/detailed

# 2. Check application logs
railway logs --tail 100

# 3. Verify database connection
# Ensure SUPABASE_SERVICE_ROLE_KEY is correct

# 4. Test authentication
curl -X POST https://quotepro-backend.railway.app/api/generate-quote \
  -H "Content-Type: application/json" \
  -d '{"job_description": "test"}'
# Should return 401 (auth working)

# 5. Check CORS
curl -i https://quotepro-backend.railway.app/api/health \
  -H "Origin: https://quotepro.vercel.app"
# Should have Access-Control-Allow-Origin header
```

### Issue: CI/CD workflow fails

**Symptoms:**
```
Error: Secret VERCEL_TOKEN not found
Workflow failed
```

**Solutions:**
```bash
# 1. Verify all secrets are set
# GitHub → Settings → Secrets and variables → Actions

# 2. Check secret names match workflow
# Ensure exact case-sensitive match

# 3. Re-run workflow
gh workflow run deploy.yml

# 4. Check workflow logs
gh run list
gh run view <run-id>
```

---

## Production Checklist

Before going live:

### Security
- [ ] All GitHub secrets configured
- [ ] Supabase RLS policies enabled
- [ ] JWT authentication working
- [ ] Rate limiting active
- [ ] CORS restricted to production domain
- [ ] HTTPS enforced (Vercel/Railway do this automatically)

### Environment Variables
- [ ] Frontend env vars set in Vercel
- [ ] Backend env vars set in Railway/Render
- [ ] `JSON_LOGS=true` for production
- [ ] `LOG_LEVEL=INFO` (not DEBUG)
- [ ] `ALLOWED_ORIGINS` set to production URL

### Database
- [ ] All migrations applied
- [ ] RLS policies tested
- [ ] Backups enabled (Supabase does daily)
- [ ] Point-in-time recovery available

### Monitoring
- [ ] Sentry configured (optional)
- [ ] Vercel Analytics enabled
- [ ] Backend health endpoints responding
- [ ] Error tracking active

### Testing
- [ ] All tests passing
- [ ] Manual testing on staging
- [ ] Load testing completed
- [ ] Security scan clean

### Documentation
- [ ] Deployment runbook updated
- [ ] Team has access to credentials
- [ ] Rollback procedures documented
- [ ] Emergency contacts listed

---

## Post-Deployment

### 1. Verify Production
```bash
# Frontend
curl https://quotepro.vercel.app
open https://quotepro.vercel.app

# Backend
curl https://quotepro-backend.railway.app/api/health
curl https://quotepro-backend.railway.app/api/health/detailed

# Database
# Login to Supabase dashboard and verify tables exist
```

### 2. Monitor for 1 Hour
- Watch error logs (Sentry/Railway/Vercel)
- Check health endpoints every 5 minutes
- Monitor user traffic
- Test critical user flows

### 3. Communicate Launch
```markdown
🚀 QuotePro is now live!

Frontend: https://quotepro.vercel.app
Backend API: https://quotepro-backend.railway.app/docs
Status: All systems operational ✅

Features deployed:
- AI quote generation
- Quote optimization
- Upsell suggestions
- Catalog management
- Public quote viewer
- PDF generation
- Audit trail
- Security hardening

Known issues: None
```

---

## Next Steps

After successful deployment:
1. Set up monitoring alerts (Sentry, Vercel)
2. Configure auto-scaling (if using Railway Pro)
3. Set up database backups schedule
4. Create disaster recovery plan
5. Schedule security audits (quarterly)

**Deployment complete!** 🎉
