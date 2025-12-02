# QuotePro Launch Runbook

Step-by-step procedure for deploying QuotePro to production.

**Version:** 1.0  
**Last Updated:** December 2025  
**Owner:** Engineering Team

---

## Table of Contents
- [Pre-Launch Preparation](#pre-launch-preparation)
- [Launch Timeline](#launch-timeline)
- [Deployment Procedure](#deployment-procedure)
- [Verification Steps](#verification-steps)
- [Rollback Procedure](#rollback-procedure)
- [Post-Launch Monitoring](#post-launch-monitoring)
- [Troubleshooting](#troubleshooting)

---

## Pre-Launch Preparation

### T-7 Days: Final Testing

**Responsibilities:** QA Team + Engineering

- [ ] Complete all items in `PRE_LAUNCH_CHECKLIST.md`
- [ ] Run full test suite on staging
- [ ] Perform security audit
- [ ] Load test with 100 concurrent users
- [ ] Test all critical user flows
- [ ] Verify all integrations (Supabase, Gemini, SignNow)

**Deliverables:**
- ✅ All tests passing
- ✅ Security audit report
- ✅ Load test results
- ✅ Sign-off from QA

### T-3 Days: Infrastructure Preparation

**Responsibilities:** DevOps + Engineering Lead

- [ ] Create production Supabase project (if not exists)
- [ ] Configure production environment variables
- [ ] Set up GitHub environments (production)
- [ ] Configure required reviewers
- [ ] Set up monitoring dashboards
- [ ] Configure alerting (Sentry, email)
- [ ] Verify backup strategy
- [ ] Test rollback procedure on staging

**Deliverables:**
- ✅ Production infrastructure ready
- ✅ All secrets configured
- ✅ Monitoring active
- ✅ Rollback tested

### T-1 Day: Team Briefing

**Responsibilities:** Engineering Lead

- [ ] Review launch timeline with team
- [ ] Assign roles and responsibilities
- [ ] Review rollback procedure
- [ ] Set up communication channels (Slack)
- [ ] Confirm on-call rotation
- [ ] Share emergency contacts
- [ ] Final staging smoke test

**Deliverables:**
- ✅ Team briefed
- ✅ Roles assigned
- ✅ Communication ready

---

## Launch Timeline

### Recommended Launch Window
- **Day:** Tuesday or Wednesday (avoid Mondays and Fridays)
- **Time:** 10:00 AM local time (team available all day)
- **Duration:** 2-3 hours for deployment + 4 hours monitoring

**Why this timing?**
- ✅ Team fully staffed
- ✅ Full business day ahead for monitoring
- ✅ Time to rollback if needed
- ✅ Support available if users have issues

### Launch Day Schedule

| Time | Activity | Owner | Duration |
|------|----------|-------|----------|
| 09:00 | Team standup | Engineering Lead | 15 min |
| 09:15 | Final checks | DevOps | 15 min |
| 09:30 | Deploy staging (final test) | DevOps | 30 min |
| 10:00 | **Deploy to production** | DevOps | 30 min |
| 10:30 | Verification & smoke tests | QA + Engineering | 30 min |
| 11:00 | Announce launch | Product | 15 min |
| 11:15-15:00 | Active monitoring | Entire team | 4 hours |
| 15:00 | First review meeting | Engineering Lead | 30 min |
| EOD | Day 1 summary | Engineering Lead | Email |

---

## Deployment Procedure

### Step 1: Pre-Deployment Verification (09:15 - 09:30)

**Owner:** DevOps Engineer

```bash
# 1. Verify all tests pass on main branch
gh run list --branch main --limit 1

# 2. Verify staging is healthy
curl https://quotepro-staging.vercel.app/
curl https://quotepro-backend-staging.railway.app/api/health

# 3. Verify production environment variables set
# GitHub → Settings → Environments → production → Secrets
# Should have: SUPABASE_JWT_SECRET, GEMINI_API_KEY, etc.

# 4. Verify production Supabase project ready
supabase projects list
# Note production project ID

# 5. Create pre-deployment backup
./scripts/migrate-db.sh production true  # Dry run
# Manual backup via Supabase dashboard
```

**Checklist:**
- [ ] All tests passing on main
- [ ] Staging healthy
- [ ] Environment variables set
- [ ] Backup created
- [ ] Team ready

**Go/No-Go Decision:** Engineering Lead approval required

### Step 2: Database Migration (09:30 - 10:00)

**Owner:** DevOps Engineer

```bash
# 1. Set environment variables for production
export SUPABASE_ACCESS_TOKEN="sbp_your_production_token"
export SUPABASE_DB_URL="postgresql://postgres:...@db.prod-project.supabase.co:5432/postgres"

# 2. Run migration script (creates backup automatically)
./scripts/migrate-db.sh production false

# Expected output:
# ======================================
# QuotePro Database Migration
# ======================================
# Environment: production
# Dry run: false
# 
# 📦 Creating backup...
# ✅ Backup created: backup_20251201_100000.sql
# 📋 Checking pending migrations...
# Found X pending migration(s)
# 🚀 Applying migrations...
# ✅ Migrations applied successfully
# 🔍 Verifying migrations...
# ✅ Table 'companies' exists
# ✅ Table 'quotes' exists
# [... all tables ...]
# ✅ Found 50+ RLS policies
# ======================================
# ✅ Migration completed successfully
# ======================================

# 3. Verify critical tables
psql "$SUPABASE_DB_URL" -c "\dt" | grep -E "companies|quotes|pricing_items"

# 4. Verify RLS policies
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM pg_policies;"
# Should show 50+ policies
```

**Checklist:**
- [ ] Backup created
- [ ] Migrations applied
- [ ] All tables exist
- [ ] RLS policies active

**Rollback:** If migration fails, run `./scripts/rollback-db.sh <backup_file>`

### Step 3: Deploy Backend (10:00 - 10:15)

**Owner:** DevOps Engineer

**Option A: Railway**
```bash
# 1. Verify Railway token set
echo $RAILWAY_TOKEN

# 2. Deploy via GitHub Actions
gh workflow run deploy.yml -f environment=production

# 3. Monitor deployment
gh run watch

# 4. Or deploy directly via Railway CLI
railway up --service quotepro-backend-production
```

**Option B: Render**
```bash
# Deploy via webhook (configured in GitHub Actions)
# Or trigger manually from Render dashboard
```

**Option C: Docker**
```bash
# Build and push image
docker build -t yourusername/quotepro-backend:v1.0.0 python-backend/
docker push yourusername/quotepro-backend:v1.0.0

# Deploy to your server (SSH in)
ssh your-server
docker pull yourusername/quotepro-backend:v1.0.0
docker stop quotepro-backend || true
docker rm quotepro-backend || true
docker run -d --name quotepro-backend \
  -p 8000:8000 \
  --env-file /path/to/.env \
  --restart unless-stopped \
  yourusername/quotepro-backend:v1.0.0
```

**Monitor deployment:**
```bash
# Watch Railway logs
railway logs --tail 100

# Or Render logs via dashboard

# Wait for "Application startup complete"
```

**Checklist:**
- [ ] Deployment initiated
- [ ] Build successful
- [ ] Container started
- [ ] Logs show no errors

### Step 4: Deploy Frontend (10:15 - 10:25)

**Owner:** DevOps Engineer

```bash
# Frontend deploys automatically via Vercel on push to main
# Or trigger manually:

# 1. Via GitHub Actions (preferred)
gh workflow run deploy.yml -f environment=production

# 2. Via Vercel CLI
vercel --prod

# 3. Monitor deployment
vercel ls
# Find latest deployment

# 4. Check deployment logs
vercel logs <deployment-url>
```

**Monitor:**
- Vercel Dashboard → Deployments
- Look for "Ready" status
- Check build logs for errors

**Checklist:**
- [ ] Deployment initiated
- [ ] Build successful
- [ ] Deployment ready
- [ ] Domain accessible

### Step 5: Verify Deployment (10:25 - 10:45)

**Owner:** QA Engineer + DevOps

**Backend Health Checks:**
```bash
# Set production URLs
FRONTEND_URL="https://quotepro.vercel.app"
BACKEND_URL="https://quotepro-backend.railway.app"

# 1. Simple health check
curl $BACKEND_URL/api/health
# Expected: {"status": "healthy", "timestamp": "...", "uptime_seconds": ...}

# 2. Detailed health check
curl $BACKEND_URL/api/health/detailed | jq
# Expected: CPU, memory, disk usage displayed

# 3. Readiness check
curl $BACKEND_URL/api/ready
# Expected: {"status": "ready", "database": "connected", ...}

# 4. Metrics endpoint
curl $BACKEND_URL/api/metrics
# Expected: Prometheus format metrics

# 5. Test authentication (should return 401)
curl -X POST $BACKEND_URL/api/generate-quote \
  -H "Content-Type: application/json" \
  -d '{"job_description": "test"}'
# Expected: 401 Unauthorized (auth is working!)

# 6. Test rate limiting (send 65 requests, should hit limit at 60)
for i in {1..65}; do
  curl -s -o /dev/null -w "%{http_code}\n" $BACKEND_URL/api/health
done
# Expected: First 60 return 200, then 429
```

**Frontend Health Checks:**
```bash
# 1. Homepage loads
curl -I $FRONTEND_URL
# Expected: HTTP/2 200

# 2. Test in browser
open $FRONTEND_URL
# Visual check: Page loads, no errors in console

# 3. Check meta tags
curl -s $FRONTEND_URL | grep -i "<title>"
# Expected: <title>QuotePro</title>
```

**Smoke Tests (Critical User Flows):**
```bash
# Run through these manually in browser:
# 1. Sign up new user → ✅
# 2. Login → ✅
# 3. Create quote → ✅
# 4. Generate AI quote → ✅
# 5. Send quote to customer → ✅
# 6. Open public quote link → ✅
# 7. Generate PDF → ✅
# 8. View audit trail → ✅
```

**Checklist:**
- [ ] Backend health checks pass
- [ ] Frontend accessible
- [ ] Authentication working
- [ ] Rate limiting working
- [ ] All smoke tests pass
- [ ] No errors in logs

**Go/No-Go Decision:** If any critical check fails, execute rollback

### Step 6: Announce Launch (10:45 - 11:00)

**Owner:** Product Manager

**Internal Announcement:**
```markdown
🚀 QuotePro is now LIVE! 🚀

Production URL: https://quotepro.vercel.app
API Docs: https://quotepro-backend.railway.app/docs

All systems operational ✅
- Frontend: Deployed via Vercel
- Backend: Deployed via Railway
- Database: Supabase production
- Monitoring: Active

Please report any issues to #quotepro-launch channel.
```

**External Announcement (if applicable):**
- Tweet launch
- Email announcement to early users
- Update website
- Press release (if applicable)

---

## Verification Steps

### Automated Verification

**GitHub Actions already does:**
- ✅ Health checks (frontend + backend)
- ✅ Smoke tests (AI endpoint protected)
- ✅ Migration verification

**Additional checks:**
```bash
# Run full verification script
./scripts/verify-production.sh

# Or manually:
# 1. Check deployment status
gh run list --limit 1

# 2. Check health endpoints
curl $BACKEND_URL/api/health/detailed | jq

# 3. Check error rates (Sentry dashboard)
open https://sentry.io/organizations/your-org/

# 4. Check performance (Vercel Analytics)
open https://vercel.com/your-team/quotepro/analytics
```

### Manual Verification

**Test all critical flows:**
1. ✅ User signup + email verification
2. ✅ User login
3. ✅ Create manual quote
4. ✅ Generate AI quote
5. ✅ Edit quote
6. ✅ Send quote to customer (email)
7. ✅ Customer accepts quote (public link)
8. ✅ Generate PDF
9. ✅ View audit trail
10. ✅ Bulk upload catalog
11. ✅ Search catalog items
12. ✅ User logout

**Cross-browser testing:**
- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] Firefox desktop
- [ ] Safari mobile (iPhone)
- [ ] Chrome mobile (Android)

---

## Rollback Procedure

### When to Rollback

**Immediate rollback if:**
- ❌ Health checks fail
- ❌ Error rate > 5%
- ❌ Database data loss
- ❌ Authentication completely broken
- ❌ Critical security vulnerability

**Consider rollback if:**
- ⚠️ Error rate > 1% for 10+ minutes
- ⚠️ P95 response time > 5s
- ⚠️ Users unable to complete core flows
- ⚠️ Major feature completely broken

### Rollback Steps

**1. Announce Rollback**
```markdown
⚠️ ROLLING BACK PRODUCTION ⚠️

Issue: [Describe issue]
Impact: [User impact]
ETA: 15 minutes

Team on it. Updates to follow.
```

**2. Rollback Frontend (Vercel)**
```bash
# Option A: Via Vercel dashboard
# 1. Go to Vercel → Deployments
# 2. Find last working deployment
# 3. Click "..." → "Promote to Production"

# Option B: Via CLI
vercel rollback <previous-deployment-url>

# Option C: Via Git
git revert HEAD
git push origin main
# Vercel auto-deploys the revert
```

**3. Rollback Backend (Railway)**
```bash
# Option A: Via Railway dashboard
# 1. Go to Railway → Deployments
# 2. Click on previous working deployment
# 3. Click "Redeploy"

# Option B: Via Railway CLI
railway rollback <deployment-id>

# Option C: Via Docker (if self-hosted)
docker stop quotepro-backend
docker run -d --name quotepro-backend \
  --env-file .env \
  -p 8000:8000 \
  yourusername/quotepro-backend:v0.9.0  # Previous version
```

**4. Rollback Database (if needed)**
```bash
# Only if database changes caused the issue

# List available backups
ls -lh backup_*.sql

# Rollback to pre-deployment backup
./scripts/rollback-db.sh backup_20251201_095900.sql
# This creates a backup of current state before rollback

# Verify rollback
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM quotes;"
```

**5. Verify Rollback**
```bash
# Check health
curl $BACKEND_URL/api/health
curl $FRONTEND_URL

# Run smoke tests again
# Ensure application is stable
```

**6. Post-Rollback**
- ✅ Announce rollback complete
- ✅ Monitor for stability
- ✅ Investigate root cause
- ✅ Create postmortem issue
- ✅ Plan fix and re-deploy

### Rollback Checklist

- [ ] Rollback decision made by Engineering Lead
- [ ] Team notified
- [ ] Frontend rolled back
- [ ] Backend rolled back
- [ ] Database rolled back (if needed)
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Users notified (if external launch)
- [ ] Postmortem scheduled

---

## Post-Launch Monitoring

### First Hour (Intensive Monitoring)

**Owner:** Entire Engineering Team

**Monitor:**
- [ ] Error rates (target: < 0.1%)
- [ ] Response times (target: P95 < 2s)
- [ ] Health endpoints (every 5 min)
- [ ] User signups/activity
- [ ] Database connections
- [ ] Memory/CPU usage

**Tools:**
- Sentry dashboard (errors)
- Vercel Analytics (performance)
- Railway/Render logs (backend)
- Supabase dashboard (database)

**Action items:**
- Address any errors immediately
- Document any issues
- Communicate status updates every 30 min

### First Day (Active Monitoring)

**Owner:** On-Call Engineer

**Monitor:**
- [ ] Error rates (check every hour)
- [ ] Response times (check every hour)
- [ ] User feedback (check support channels)
- [ ] Database performance
- [ ] Resource usage trends

**End of day review:**
- ✅ Review metrics
- ✅ Document issues encountered
- ✅ Plan fixes for next day
- ✅ Send summary to team

### First Week (Daily Monitoring)

**Owner:** Engineering Lead

**Daily:**
- [ ] Review error logs
- [ ] Check performance trends
- [ ] Gather user feedback
- [ ] Monitor costs (Gemini API usage)
- [ ] Track feature usage

**End of week review:**
- ✅ Week 1 postmortem
- ✅ Lessons learned
- ✅ Iteration planning

---

## Troubleshooting

### Issue: Frontend Not Loading

**Symptoms:**
- Homepage returns 404 or 500
- Blank screen
- "Application Error" message

**Diagnosis:**
```bash
# Check Vercel deployment status
vercel ls

# Check Vercel logs
vercel logs <deployment-url>

# Check browser console
# Open DevTools → Console → Look for errors
```

**Solutions:**
1. Check build logs for errors
2. Verify environment variables set
3. Check for TypeScript errors
4. Rollback to previous deployment
5. Redeploy: `vercel --prod`

### Issue: Backend Not Responding

**Symptoms:**
- Health endpoint returns 500 or timeout
- API requests fail
- Connection refused errors

**Diagnosis:**
```bash
# Check Railway logs
railway logs --tail 100

# Check if container is running
railway status

# Check health endpoint
curl -v $BACKEND_URL/api/health
```

**Solutions:**
1. Check container logs for startup errors
2. Verify environment variables (especially database URL)
3. Restart service: `railway restart`
4. Check database connection: `psql $SUPABASE_DB_URL -c "SELECT 1;"`
5. Rollback to previous deployment

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Database queries timeout

**Diagnosis:**
```bash
# Check database status
supabase db status

# Check connection count
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
psql $SUPABASE_DB_URL -c "SELECT pid, usename, state, query FROM pg_stat_activity WHERE state != 'idle';"
```

**Solutions:**
1. Check Supabase dashboard for outages
2. Verify `SUPABASE_DB_URL` correct
3. Enable connection pooler in Supabase
4. Kill long-running queries if needed
5. Increase connection limit (paid plan)

### Issue: High Error Rate

**Symptoms:**
- Sentry shows spike in errors
- Error rate > 1%
- Users reporting issues

**Diagnosis:**
```bash
# Check Sentry for error patterns
open https://sentry.io

# Check logs for specific errors
railway logs --tail 500 | grep ERROR

# Check which endpoint is failing
curl $BACKEND_URL/api/health/detailed
```

**Solutions:**
1. Identify error pattern (auth? database? AI?)
2. Hot-fix if simple (e.g., missing env var)
3. Rollback if widespread
4. Scale up resources if performance-related
5. Communicate to users if user-facing

### Issue: Slow Performance

**Symptoms:**
- Response times > 5s
- Timeout errors
- Users complaining of slowness

**Diagnosis:**
```bash
# Check Web Vitals
open Vercel Analytics dashboard

# Check backend response times
curl -w "@curl-format.txt" -o /dev/null -s $BACKEND_URL/api/quotes

# Check database slow queries
psql $SUPABASE_DB_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**
1. Add missing database indexes
2. Optimize slow queries
3. Enable caching
4. Scale up backend (more workers/memory)
5. Use CDN for static assets
6. Optimize API payload sizes

---

## Success Metrics

**Launch is successful if (first 24 hours):**
- ✅ Uptime: > 99%
- ✅ Error rate: < 1%
- ✅ P95 response time: < 2s
- ✅ User signups: > 0 (if public)
- ✅ No critical bugs
- ✅ No security incidents
- ✅ No data loss
- ✅ Team morale: High! 🎉

---

## Post-Launch Tasks

**Immediate (Day 1):**
- [ ] Send launch summary email to team
- [ ] Celebrate! 🎉
- [ ] Monitor closely

**Short-term (Week 1):**
- [ ] Week 1 postmortem meeting
- [ ] Fix any minor issues
- [ ] Gather user feedback
- [ ] Plan iteration 1

**Mid-term (Month 1):**
- [ ] Month 1 review
- [ ] Analyze usage metrics
- [ ] Plan roadmap
- [ ] Security review

---

## Emergency Contacts

**Engineering Team:**
- Primary On-Call: [Name] - [Phone]
- Secondary On-Call: [Name] - [Phone]
- Engineering Lead: [Name] - [Phone]

**External Support:**
- Vercel Support: support@vercel.com
- Railway Support: help@railway.app
- Supabase Support: support@supabase.com
- Google AI Support: [Support link]

**Communication Channels:**
- Slack: #quotepro-launch
- Email: team@yourcompany.com
- Phone: [Team phone tree]

---

## Appendix

### Useful Commands

```bash
# Health check
curl $BACKEND_URL/api/health | jq

# View logs
railway logs --tail 100
vercel logs <deployment-url>

# Database access
psql $SUPABASE_DB_URL

# Rollback
./scripts/rollback-db.sh backup_*.sql
vercel rollback <deployment-url>
railway rollback <deployment-id>

# Redeploy
gh workflow run deploy.yml
vercel --prod
railway up
```

### curl-format.txt
```
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
```

---

**Good luck with the launch!** 🚀

You've done the preparation. You've got this!
