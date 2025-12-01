# Environment Configuration Guide

QuotePro supports multiple environments: development, staging, and production.

## Environments

### Development (Local)
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000
- **Database:** Supabase development project
- **Secrets:** `.env.local` files
- **Purpose:** Local development and testing

### Staging
- **Frontend:** https://quotepro-staging.vercel.app
- **Backend:** https://quotepro-backend-staging.railway.app
- **Database:** Supabase staging project
- **Secrets:** GitHub environment secrets (staging)
- **Purpose:** Pre-production testing, QA validation

### Production
- **Frontend:** https://quotepro.vercel.app
- **Backend:** https://quotepro-backend.railway.app
- **Database:** Supabase production project
- **Secrets:** GitHub environment secrets (production)
- **Purpose:** Live customer-facing application

---

## Environment Variables by Environment

### Development (`.env.local` / `.env`)

**Frontend (`/.env.local`):**
```bash
# Supabase (development project)
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...dev-key

# Backend URL (local)
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:8000

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Optional: Development features
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
NEXT_PUBLIC_SHOW_DEBUG_INFO=true
```

**Backend (`/python-backend/.env`):**
```bash
# Supabase (development project)
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...dev-service-key
SUPABASE_JWT_SECRET=your-dev-jwt-secret

# Gemini AI
GEMINI_API_KEY=AIzaSy...

# Security (permissive for local development)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging (human-readable)
JSON_LOGS=false
LOG_LEVEL=DEBUG
LOG_FILE=

# Optional: Development features
ENABLE_DEBUG_ROUTES=true
```

### Staging (GitHub Secrets + Vercel/Railway)

**GitHub Environment Secrets (`staging`):**
```bash
# Supabase (staging project)
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...staging-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...staging-service-key
SUPABASE_JWT_SECRET=your-staging-jwt-secret
SUPABASE_ACCESS_TOKEN=sbp_staging_token
SUPABASE_DB_URL=postgresql://postgres:password@db.staging-project.supabase.co:5432/postgres

# Gemini AI (can use same key or separate)
GEMINI_API_KEY=AIzaSy...

# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=team_abc123
VERCEL_PROJECT_ID=prj_staging_abc123

# Railway
RAILWAY_TOKEN=your_railway_token

# Application URLs
FRONTEND_URL=https://quotepro-staging.vercel.app
BACKEND_URL=https://quotepro-backend-staging.railway.app
```

**Vercel Environment Variables (staging):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...staging-key
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://quotepro-backend-staging.railway.app
GEMINI_API_KEY=AIzaSy...
```

**Railway Environment Variables (staging):**
```bash
GEMINI_API_KEY=AIzaSy...
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...staging-service-key
SUPABASE_JWT_SECRET=your-staging-jwt-secret
ALLOWED_ORIGINS=https://quotepro-staging.vercel.app
JSON_LOGS=true
LOG_LEVEL=INFO
```

### Production (GitHub Secrets + Vercel/Railway)

**GitHub Environment Secrets (`production`):**
```bash
# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...prod-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...prod-service-key
SUPABASE_JWT_SECRET=your-production-jwt-secret
SUPABASE_ACCESS_TOKEN=sbp_production_token
SUPABASE_DB_URL=postgresql://postgres:password@db.prod-project.supabase.co:5432/postgres

# Gemini AI (production key recommended)
GEMINI_API_KEY=AIzaSy...production-key

# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=team_abc123
VERCEL_PROJECT_ID=prj_production_abc123

# Railway
RAILWAY_TOKEN=your_railway_token

# Application URLs
FRONTEND_URL=https://quotepro.vercel.app
BACKEND_URL=https://quotepro-backend.railway.app

# Optional: Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

**Vercel Environment Variables (production):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...prod-key
NEXT_PUBLIC_PYTHON_BACKEND_URL=https://quotepro-backend.railway.app
GEMINI_API_KEY=AIzaSy...production-key

# Optional: Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

**Railway Environment Variables (production):**
```bash
GEMINI_API_KEY=AIzaSy...production-key
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...prod-service-key
SUPABASE_JWT_SECRET=your-production-jwt-secret
ALLOWED_ORIGINS=https://quotepro.vercel.app
JSON_LOGS=true
LOG_LEVEL=WARNING  # Less verbose in production

# Optional: Monitoring
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

---

## Setting Up Environments

### 1. GitHub Environments

**Create environments:**
```bash
# Via GitHub UI
# Repository → Settings → Environments → New environment
# Create: "staging" and "production"
```

**Configure protection rules:**

**Staging:**
- ✅ No required reviewers (auto-deploy for testing)
- ⬜ Wait timer
- ✅ Deployment branches: `develop` or `main`

**Production:**
- ✅ Required reviewers: 1+ team members
- ✅ Wait timer: 5 minutes (optional)
- ✅ Deployment branches: `main` only

**Add environment secrets:**
1. Go to Settings → Environments → [Environment Name]
2. Add secrets (see lists above)
3. Secrets override repository secrets

### 2. Vercel Environments

**Create preview/production split:**
```bash
# Production (auto-deploy from main)
vercel --prod

# Preview (auto-deploy from other branches)
vercel
```

**Set environment-specific variables:**
1. Vercel Dashboard → Project → Settings → Environment Variables
2. For each variable, select scope:
   - ✅ Production (main branch)
   - ✅ Preview (other branches)
   - ✅ Development (local dev)

### 3. Railway Environments

**Option A: Separate services (recommended):**
```bash
# Create staging service
railway service create quotepro-backend-staging

# Create production service
railway service create quotepro-backend-production

# Deploy to specific service
railway up --service quotepro-backend-staging
railway up --service quotepro-backend-production
```

**Option B: Same service, different branches:**
```bash
# Railway watches branches
# staging branch → staging deployment
# main branch → production deployment
```

---

## Environment Variable Management

### Security Best Practices

**DO:**
- ✅ Use different secrets for each environment
- ✅ Rotate secrets regularly (quarterly)
- ✅ Use GitHub encrypted secrets
- ✅ Limit access to production secrets
- ✅ Use service role key only in backend
- ✅ Use anon key in frontend (safe for public)

**DON'T:**
- ❌ Hardcode secrets in code
- ❌ Commit `.env` files to git
- ❌ Share production secrets in Slack/email
- ❌ Use same secrets across environments
- ❌ Expose service role key in frontend

### Secret Rotation

**When to rotate:**
- Every 90 days (quarterly)
- After team member leaves
- After suspected leak
- After security incident

**How to rotate:**
1. Generate new secret (Supabase/Gemini)
2. Update in GitHub secrets
3. Update in Vercel/Railway
4. Deploy with new secret
5. Verify application works
6. Revoke old secret

---

## Environment Switching

### Local Development

**Switch database projects:**
```bash
# Link to staging
supabase link --project-ref staging-ref

# Link to production (careful!)
supabase link --project-ref production-ref
```

**Use environment-specific .env:**
```bash
# Development
cp .env.development .env

# Staging (for local testing)
cp .env.staging .env

# Never use production locally!
```

### CI/CD Environment Selection

**Manual deploy to staging:**
```bash
gh workflow run deploy.yml -f environment=staging
```

**Automatic deploy based on branch:**
```yaml
# In .github/workflows/deploy.yml
on:
  push:
    branches:
      - main         # → production
      - develop      # → staging
```

---

## Verification Checklist

Before deploying to each environment:

### Development ✅
- [ ] `.env.local` file created
- [ ] Supabase dev project linked
- [ ] Local backend starts (`uvicorn main:app`)
- [ ] Local frontend starts (`npm run dev`)
- [ ] Can authenticate (login works)
- [ ] Can create quotes

### Staging ✅
- [ ] GitHub staging environment created
- [ ] All secrets added to GitHub
- [ ] Vercel project configured
- [ ] Railway staging service created
- [ ] Deploy workflow runs successfully
- [ ] Health checks pass
- [ ] Can access staging frontend
- [ ] Can access staging backend API
- [ ] Authentication works
- [ ] AI features work

### Production ✅
- [ ] GitHub production environment created
- [ ] All secrets added (production-specific)
- [ ] Vercel production project configured
- [ ] Railway production service created
- [ ] Required reviewers set
- [ ] Deploy workflow tested on staging first
- [ ] Health checks pass
- [ ] Monitoring configured (Sentry)
- [ ] Backups enabled (Supabase)
- [ ] Team has emergency access

---

## Troubleshooting

### "Environment not found"
**Solution:** Create environment in GitHub Settings → Environments

### "Secret not found"
**Solution:** Add secret to environment (not just repository)

### "Wrong database connected"
**Solution:** Check `NEXT_PUBLIC_SUPABASE_URL` matches environment

### "CORS error in staging"
**Solution:** Update `ALLOWED_ORIGINS` to include staging URL

### "Tests pass locally but fail in CI"
**Solution:** Ensure GitHub secrets match local `.env`

---

## Environment Comparison

| Feature | Development | Staging | Production |
|---------|------------|---------|------------|
| Database | Supabase dev | Supabase staging | Supabase prod |
| Frontend | localhost:3000 | staging.vercel.app | quotepro.vercel.app |
| Backend | localhost:8000 | staging.railway.app | railway.app |
| Logging | DEBUG, console | INFO, JSON | WARNING, JSON |
| Secrets | .env files | GitHub + Platform | GitHub + Platform |
| Auto-deploy | No | Yes (develop) | Yes (main) |
| Required review | No | No | Yes (1+) |
| Monitoring | Console | Basic | Full (Sentry) |
| Backups | None | Daily | Daily + PITR |
| CORS | localhost:* | staging URL | production URL |

---

## Next Steps

1. ✅ Create GitHub staging environment
2. ✅ Create GitHub production environment
3. ✅ Add all secrets to both environments
4. ✅ Configure Vercel project
5. ✅ Configure Railway services
6. ✅ Test staging deployment
7. ✅ Test production deployment
8. ✅ Document team access

**Environments ready!** Proceed to database migration automation.
