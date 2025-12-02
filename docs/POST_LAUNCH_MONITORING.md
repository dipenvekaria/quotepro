# Post-Launch Monitoring Guide

Comprehensive guide for monitoring QuotePro after production launch.

**Version:** 1.0  
**Last Updated:** December 2025

---

## Monitoring Stack

### Frontend Monitoring
- **Vercel Analytics** - Web Vitals, page views, traffic
- **Web Vitals Tracking** - Custom FCP, LCP, CLS, FID, TTFB, INP tracking
- **Browser Console** - Client-side errors
- **Sentry** (Optional) - Frontend error tracking

### Backend Monitoring
- **Health Endpoints** - `/api/health`, `/api/health/detailed`, `/api/metrics`
- **Railway/Render Logs** - Application logs with request IDs
- **Structured Logging** - JSON logs with context
- **Sentry** (Optional) - Backend error tracking

### Database Monitoring
- **Supabase Dashboard** - Connection count, query performance
- **Query Performance** - Slow query logs
- **Storage Usage** - Database size, backups

### Infrastructure Monitoring
- **Railway/Render Dashboard** - CPU, memory, disk usage
- **Vercel Dashboard** - Build times, deployment status
- **GitHub Actions** - CI/CD pipeline health

---

## Key Metrics to Monitor

### Application Health

| Metric | Target | Alert Threshold | Check Frequency |
|--------|--------|-----------------|-----------------|
| Uptime | > 99.9% | < 99% | Every 5 min |
| Error Rate | < 0.5% | > 1% | Every 5 min |
| Response Time (P50) | < 500ms | > 1s | Every 5 min |
| Response Time (P95) | < 2s | > 5s | Every 5 min |
| Response Time (P99) | < 5s | > 10s | Every 5 min |

### Web Vitals (Frontend)

| Metric | Good | Needs Improvement | Poor | Alert If |
|--------|------|-------------------|------|----------|
| FCP | < 1.8s | 1.8s - 3s | > 3s | > 3s |
| LCP | < 2.5s | 2.5s - 4s | > 4s | > 4s |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 | > 0.25 |
| FID | < 100ms | 100ms - 300ms | > 300ms | > 300ms |
| TTFB | < 800ms | 800ms - 1800ms | > 1800ms | > 1800ms |
| INP | < 200ms | 200ms - 500ms | > 500ms | > 500ms |

### Backend Performance

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| AI Quote Generation | < 10s | > 15s |
| AI Optimization | < 8s | > 12s |
| AI Upsells | < 8s | > 12s |
| Catalog Indexing (bulk) | < 60s/1000 items | > 120s |
| Quote List Load | < 500ms | > 2s |
| Customer List Load | < 500ms | > 2s |
| Catalog Search | < 300ms | > 1s |

### Resource Usage

| Resource | Normal | Warning | Critical |
|----------|--------|---------|----------|
| CPU Usage | < 50% | 50-80% | > 80% |
| Memory Usage | < 70% | 70-85% | > 85% |
| Disk Usage | < 70% | 70-85% | > 85% |
| Database Connections | < 20 | 20-40 | > 40 |

### Business Metrics

| Metric | Track |
|--------|-------|
| Daily Active Users | Count |
| Quotes Created (Manual) | Count |
| Quotes Created (AI) | Count |
| Quote Acceptance Rate | % |
| AI Feature Usage | % of quotes using AI |
| Catalog Items Indexed | Count |
| PDF Downloads | Count |
| Public Quote Views | Count |

---

## Monitoring Dashboards

### 1. Vercel Analytics Dashboard

**Access:** https://vercel.com/your-team/quotepro/analytics

**Key Metrics:**
- **Visitors:** Daily active users
- **Page Views:** Traffic patterns
- **Web Vitals:** FCP, LCP, CLS, FID scores
- **Top Pages:** Most visited pages
- **Devices:** Desktop vs mobile split
- **Countries:** Geographic distribution

**What to Watch:**
- ✅ Web Vitals scores staying "Good"
- ⚠️ Sudden drop in traffic
- ⚠️ Spike in poor Web Vitals
- ⚠️ Increase in bounce rate

### 2. Railway/Render Dashboard

**Access:** 
- Railway: https://railway.app/dashboard
- Render: https://dashboard.render.com/

**Key Metrics:**
- **CPU Usage:** % utilization over time
- **Memory Usage:** MB used / total
- **Network:** Requests per second
- **Response Times:** P50, P95, P99
- **Deployments:** Recent deploy history
- **Logs:** Real-time application logs

**What to Watch:**
- ✅ CPU < 50% average
- ✅ Memory stable (no leaks)
- ⚠️ CPU spikes > 80%
- ⚠️ Memory growing continuously
- ⚠️ High request latency

### 3. Supabase Dashboard

**Access:** https://app.supabase.com/project/your-project

**Key Metrics:**
- **Database Health:** Connection count, CPU usage
- **Disk Usage:** Database size, growth rate
- **Slow Queries:** Queries > 1s execution time
- **API Requests:** Requests per minute
- **Active Connections:** Current connections
- **Backups:** Last backup time

**What to Watch:**
- ✅ Connection count < 20
- ✅ No slow queries
- ⚠️ Connection count > 40 (approaching limit)
- ⚠️ Slow queries > 5s
- ⚠️ Disk usage > 80%

### 4. Custom Monitoring Dashboard

**Access:** `/admin/monitoring` (if implemented)

**Key Metrics:**
- **System Status:** Service health (frontend, backend, database)
- **Uptime:** Since last deployment
- **CPU Usage:** Current %
- **Memory Usage:** Current MB / total
- **Disk Usage:** Free GB
- **Recent Errors:** Last 10 errors from logs
- **Request Volume:** Requests per minute

**Implementation:**
```typescript
// Already created: src/components/monitoring-dashboard.tsx
// Usage: Add to admin/settings page
import { MonitoringDashboard } from '@/components/monitoring-dashboard';

export default function AdminPage() {
  return <MonitoringDashboard />;
}
```

### 5. Sentry Dashboard (Optional)

**Access:** https://sentry.io/organizations/your-org/

**Key Metrics:**
- **Error Rate:** Errors per minute
- **User Impact:** % of users affected
- **Release Health:** Error rate by deployment
- **Performance:** Slow transactions
- **Issues:** Grouped errors with stack traces

**What to Watch:**
- ✅ Error rate < 0.1%
- ⚠️ New error types appearing
- ⚠️ Error rate spike
- ⚠️ Errors affecting > 5% users

---

## Monitoring Workflows

### Daily Monitoring (Morning Check)

**Owner:** On-Call Engineer  
**Duration:** 15 minutes

**Checklist:**
1. [ ] Check health endpoints
   ```bash
   curl https://quotepro.vercel.app
   curl https://quotepro-backend.railway.app/api/health
   ```

2. [ ] Review Vercel Analytics (last 24 hours)
   - Traffic patterns normal?
   - Web Vitals scores good?
   - Any anomalies?

3. [ ] Review Railway/Render Dashboard
   - CPU/memory usage normal?
   - Any errors in logs?
   - Response times good?

4. [ ] Review Supabase Dashboard
   - Connection count normal?
   - Any slow queries?
   - Disk usage growing as expected?

5. [ ] Review Sentry (if configured)
   - Error rate acceptable?
   - New error types?
   - Trending issues?

6. [ ] Check GitHub Actions
   - All workflows passing?
   - Any deployment failures?

**Report:** Post summary to #quotepro-monitoring Slack channel

### Weekly Monitoring (Deep Dive)

**Owner:** Engineering Lead  
**Duration:** 1 hour

**Tasks:**
1. [ ] **Performance Analysis**
   - Analyze Web Vitals trends
   - Identify slow endpoints
   - Review database query performance
   - Check for performance regressions

2. [ ] **Error Analysis**
   - Review all errors from past week
   - Group by type/cause
   - Identify patterns
   - Prioritize fixes

3. [ ] **Resource Usage Trends**
   - CPU usage trends
   - Memory usage trends
   - Disk growth rate
   - Predict capacity needs

4. [ ] **Business Metrics**
   - User growth
   - Feature adoption (AI quotes, PDFs, etc.)
   - Quote acceptance rates
   - AI cost analysis

5. [ ] **Cost Analysis**
   - Vercel costs
   - Railway/Render costs
   - Supabase costs
   - Gemini API costs
   - Total infrastructure spend

**Deliverable:** Weekly monitoring report with action items

### Monthly Monitoring (Strategic Review)

**Owner:** Engineering Lead + Product Manager  
**Duration:** 2 hours

**Topics:**
1. [ ] **Performance Review**
   - Overall performance trends
   - SLA compliance (uptime, response times)
   - Improvement opportunities

2. [ ] **Reliability Review**
   - Incident count and severity
   - Mean time to detect (MTTD)
   - Mean time to resolve (MTTR)
   - Postmortem action items

3. [ ] **Capacity Planning**
   - User growth projections
   - Resource scaling needs
   - Database growth predictions
   - Infrastructure budget

4. [ ] **Feature Usage Analysis**
   - Most used features
   - Least used features
   - AI feature ROI
   - Product roadmap alignment

5. [ ] **Security Review**
   - Security incidents
   - Failed authentication attempts
   - Rate limit violations
   - Action items from security audit

**Deliverable:** Monthly report + roadmap updates

---

## Alert Configuration

### Critical Alerts (Immediate Response)

**Trigger:** Page on-call engineer immediately

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Service Down | Health check fails 3 times | < 5 min |
| High Error Rate | Error rate > 5% for 5 min | < 5 min |
| Database Down | Cannot connect for 2 min | < 5 min |
| Disk Full | Disk usage > 95% | < 10 min |
| Security Breach | Multiple auth failures from same IP | < 5 min |

**Setup:**
```bash
# Example: Sentry alert rules
# Go to Sentry → Alerts → Create Alert Rule
# Condition: Error rate > 5% for 5 minutes
# Action: Send email + Slack notification
```

### Warning Alerts (Business Hours Response)

**Trigger:** Notify on-call engineer via Slack

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| High CPU | CPU > 80% for 15 min | < 30 min |
| High Memory | Memory > 85% for 15 min | < 30 min |
| Slow Responses | P95 > 5s for 10 min | < 30 min |
| Many Connections | DB connections > 40 | < 30 min |
| Failed Deployments | GitHub Actions deploy fails | < 30 min |

### Info Alerts (Daily Review)

**Trigger:** Daily summary email

| Alert | Condition |
|-------|-----------|
| Daily Error Summary | All errors from last 24 hours |
| Usage Report | DAU, quotes created, AI usage |
| Cost Report | Infrastructure spend |
| Performance Report | Web Vitals, response times |

---

## Incident Response

### Severity Levels

**SEV1 - Critical (Service Down)**
- **Impact:** All users unable to use application
- **Examples:** Complete outage, database down, authentication broken
- **Response:** Immediate (< 5 min)
- **Team:** All hands on deck
- **Communication:** Update every 15 min

**SEV2 - High (Major Degradation)**
- **Impact:** Core features unavailable or severely degraded
- **Examples:** AI features down, quote creation broken, high error rate
- **Response:** < 30 min
- **Team:** On-call + engineering lead
- **Communication:** Update every 30 min

**SEV3 - Medium (Partial Degradation)**
- **Impact:** Non-core features unavailable or slow performance
- **Examples:** PDF generation slow, catalog search errors, minor UI bugs
- **Response:** < 2 hours
- **Team:** On-call engineer
- **Communication:** Initial update, then on resolution

**SEV4 - Low (Minor Issue)**
- **Impact:** Minimal user impact, cosmetic issues
- **Examples:** Typos, minor UI glitches, non-critical warnings
- **Response:** Next business day
- **Team:** Assigned to backlog
- **Communication:** None (track in issue tracker)

### Incident Response Procedure

**1. Detect (0-5 min)**
- Alert triggered or user report received
- On-call engineer paged
- Acknowledge alert

**2. Assess (5-10 min)**
- Determine severity (SEV1-4)
- Check health endpoints
- Review logs/errors
- Identify scope of impact

**3. Communicate (10-15 min)**
- Create incident channel (#incident-YYYYMMDD)
- Notify team based on severity
- Post initial status update
- Assign incident commander (SEV1/2)

**4. Mitigate (15+ min)**
- Apply immediate fix if known
- Rollback if recent deployment
- Implement workaround
- Restore service

**5. Resolve (varies)**
- Verify fix works
- Monitor for stability (30 min)
- Close incident
- Post final status update

**6. Postmortem (1-2 days after)**
- Write incident report
- Root cause analysis
- Action items to prevent recurrence
- Share learnings with team

---

## Monitoring Tools & Commands

### Health Check Commands

```bash
# Quick health check
curl https://quotepro-backend.railway.app/api/health | jq

# Detailed health check
curl https://quotepro-backend.railway.app/api/health/detailed | jq

# Readiness check
curl https://quotepro-backend.railway.app/api/ready | jq

# Metrics (Prometheus format)
curl https://quotepro-backend.railway.app/api/metrics
```

### Log Commands

```bash
# Railway logs (last 100 lines)
railway logs --tail 100

# Railway logs (follow/stream)
railway logs --follow

# Filter logs for errors
railway logs | grep ERROR

# Filter logs by request ID
railway logs | grep "request_id:abc-123"

# Vercel logs
vercel logs <deployment-url>
```

### Database Commands

```bash
# Connection count
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Active queries
psql $SUPABASE_DB_URL -c "SELECT pid, usename, state, query FROM pg_stat_activity WHERE state != 'idle';"

# Slow queries (> 1s)
psql $SUPABASE_DB_URL -c "SELECT * FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10;"

# Database size
psql $SUPABASE_DB_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Table sizes
psql $SUPABASE_DB_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Performance Testing

```bash
# Test response time
time curl -s https://quotepro-backend.railway.app/api/health > /dev/null

# Detailed timing
curl -w "@curl-format.txt" -o /dev/null -s https://quotepro-backend.railway.app/api/health

# Load test (100 requests, 10 concurrent)
ab -n 100 -c 10 https://quotepro-backend.railway.app/api/health
```

---

## Performance Baselines

### Establish Baselines (First Week)

Track these metrics for first 7 days to establish normal ranges:

**Response Times:**
- Homepage load time: ___s
- Quote list load: ___s
- AI quote generation: ___s
- PDF generation: ___s

**Resource Usage:**
- Average CPU: ___%
- Average Memory: ___MB
- Peak CPU: ___%
- Peak Memory: ___MB

**Traffic:**
- Daily Active Users: ___
- Quotes per day: ___
- AI queries per day: ___

**Errors:**
- Daily error count: ___
- Error rate: ___%

**Costs:**
- Daily Gemini API cost: $___
- Monthly infrastructure cost: $___

### Track Deviations

**Alert if metric deviates > 50% from baseline:**
- Response times 50% slower
- Resource usage 50% higher
- Error rate 2x baseline
- Costs 50% higher

---

## Monitoring Checklist

### First 24 Hours ✅
- [ ] Monitor health endpoints every 15 min
- [ ] Review logs hourly
- [ ] Check error rates hourly
- [ ] Verify user signups working
- [ ] Test all critical flows
- [ ] Monitor resource usage
- [ ] Check for memory leaks
- [ ] Verify backups running

### First Week ✅
- [ ] Daily morning health check
- [ ] Daily log review
- [ ] Establish performance baselines
- [ ] Track feature usage
- [ ] Monitor costs
- [ ] Gather user feedback
- [ ] Fix any minor issues
- [ ] Week 1 retrospective

### First Month ✅
- [ ] Weekly deep dive reviews
- [ ] Monthly strategic review
- [ ] Capacity planning
- [ ] Cost optimization
- [ ] Security review
- [ ] Performance optimization
- [ ] Feature usage analysis
- [ ] Roadmap planning

---

## Success Metrics

**Monitoring is successful if:**
- ✅ Incidents detected within 5 minutes
- ✅ Incidents resolved within SLA
- ✅ Uptime > 99.9%
- ✅ Error rate < 0.5%
- ✅ Performance within baselines
- ✅ Costs within budget
- ✅ User satisfaction high

---

## Resources

**Dashboards:**
- Vercel: https://vercel.com/your-team/quotepro/analytics
- Railway: https://railway.app/dashboard
- Supabase: https://app.supabase.com/project/your-project
- Sentry: https://sentry.io/organizations/your-org/

**Documentation:**
- Monitoring Dashboard: `src/components/monitoring-dashboard.tsx`
- Health Endpoints: `app/routes/health.py`
- Web Vitals: `src/lib/web-vitals.ts`
- Logging Config: `app/logging_config.py`

**Support:**
- On-Call: [Phone]
- Slack: #quotepro-monitoring
- Email: team@yourcompany.com

---

**Happy monitoring!** 📊

Remember: Good monitoring prevents fires. Great monitoring puts them out fast.
