# Monitoring & Observability - Hybrid Approach

## Overview

QuotePro implements a **hybrid monitoring strategy** combining external services for critical features with internal systems for detailed metrics.

## Architecture

### External Services (Free Tiers)
1. **Sentry** - Critical error tracking only
2. **Vercel Analytics** - Web Vitals (built-in)
3. **Better Uptime** - Service uptime monitoring (optional)

### Internal Systems
1. **Structured Logging** - Python JSON logs
2. **Supabase** - AI usage metrics (already built)
3. **Health Endpoints** - Service status checks
4. **Monitoring Dashboard** - Internal metrics view

---

## 1. Error Tracking: Sentry

### Setup

**Install Sentry** (optional):
```bash
npm install @sentry/nextjs
```

**Configuration Files**:
- `sentry.client.config.ts` - Frontend error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `.env.sentry.example` - Environment variable template

**Get Your DSN**:
1. Sign up at https://sentry.io (free tier: 5K errors/month)
2. Create a new Next.js project
3. Copy the DSN from Settings → Client Keys
4. Add to `.env.local`:
```bash
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
```

**Leave empty to disable Sentry** (will skip in development automatically).

### Features

✅ **Error Boundary Integration**
- Automatically catches React errors
- User context (company ID, user ID)
- Source maps for debugging

✅ **Filtered Errors**
- Ignores network errors (handled by NetworkStatus)
- Production-only (disabled in development)
- Critical errors only

✅ **Session Replay**
- 100% of error sessions
- 1% of normal sessions
- Privacy-safe (masks text/media)

### Usage

Sentry is **automatic** once configured. Our `ErrorBoundary` component integrates seamlessly.

---

## 2. Structured Logging: Python Backend

### Implementation

**Files**:
- `app/logging_config.py` - JSON formatter, colored console
- `app/middleware/logging.py` - Request logging middleware

### Features

✅ **JSON Logging** (production)
```json
{
  "timestamp": "2025-12-01T10:30:00Z",
  "level": "INFO",
  "logger": "app.routes.ai",
  "message": "POST /api/generate-quote - 200",
  "request_id": "abc-123",
  "user_id": "user_456",
  "company_id": "company_789",
  "endpoint": "/api/generate-quote",
  "duration_ms": 1234.56
}
```

✅ **Colored Console** (development)
- Easy to read during development
- Color-coded log levels
- Timestamps

✅ **Request Context**
- Unique request ID
- User/company context
- Performance timing
- Exception tracebacks

### Configuration

**Environment Variables**:
```bash
# python-backend/.env
LOG_LEVEL=INFO          # DEBUG, INFO, WARNING, ERROR, CRITICAL
JSON_LOGS=false         # true for production JSON logs
LOG_FILE=               # Optional: /var/log/quotepro.log
```

### Usage

```python
from app.logging_config import get_logger

logger = get_logger(__name__)

# Simple logging
logger.info("Quote generated successfully")

# With context
logger.info(
    "Quote generated",
    extra={
        'extra_data': {
            'quote_id': quote.id,
            'company_id': company_id,
            'line_items_count': len(quote.line_items)
        }
    }
)

# Error logging
try:
    generate_quote()
except Exception as e:
    logger.error("Quote generation failed", exc_info=True)
```

### Middleware

Automatically logs all HTTP requests:
- Request start (method, path, query params, client IP)
- Request end (status code, duration)
- Errors (with full traceback)
- Request ID in response header (`X-Request-ID`)

---

## 3. Web Vitals Tracking

### Implementation

**Files**:
- `src/lib/web-vitals.ts` - Tracking logic
- `src/app/api/vitals/route.ts` - Collection endpoint

### Metrics Tracked

- **FCP** (First Contentful Paint) - < 1.8s good
- **LCP** (Largest Contentful Paint) - < 2.5s good
- **CLS** (Cumulative Layout Shift) - < 0.1 good
- **FID** (First Input Delay) - < 100ms good
- **TTFB** (Time to First Byte) - < 800ms good
- **INP** (Interaction to Next Paint) - < 200ms good

### Setup

Add to `src/app/layout.tsx`:
```tsx
import { reportWebVitals } from '@/lib/web-vitals'

export { reportWebVitals }
```

### Console Output (Development)

```
[Web Vitals] { name: 'FCP', value: 1234, rating: 'good' }
[Web Vitals] { name: 'LCP', value: 2100, rating: 'good' }
[Web Vitals] { name: 'CLS', value: 50, rating: 'good' }
```

### API Endpoint

`POST /api/vitals` receives metrics in production.

**Extend to**:
- Store in Supabase for analysis
- Send to PostHog/Analytics
- Track over time for regressions

---

## 4. Health Check Endpoints

### Implementation

**File**: `app/routes/health.py`

### Endpoints

#### `GET /api/health`
Simple health check for uptime monitoring.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00Z",
  "uptime_seconds": 123456.78
}
```

#### `GET /api/health/detailed`
Detailed health with system metrics.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T10:30:00Z",
  "uptime_seconds": 123456.78,
  "system": {
    "python_version": "3.11.5",
    "cpu_percent": 12.5,
    "memory": {
      "total_mb": 16384,
      "available_mb": 8192,
      "percent_used": 50.0
    },
    "disk": {
      "total_gb": 500,
      "free_gb": 250,
      "percent_used": 50.0
    }
  }
}
```

#### `GET /api/metrics`
Prometheus-compatible metrics.

**Response**:
```
# HELP quotepro_uptime_seconds Application uptime in seconds
# TYPE quotepro_uptime_seconds gauge
quotepro_uptime_seconds 123456.78

# HELP quotepro_memory_usage_percent Memory usage percentage
# TYPE quotepro_memory_usage_percent gauge
quotepro_memory_usage_percent 50.0

# HELP quotepro_cpu_usage_percent CPU usage percentage
# TYPE quotepro_cpu_usage_percent gauge
quotepro_cpu_usage_percent 12.5
```

#### `GET /api/ready`
Kubernetes-style readiness probe.

**Response**:
```json
{
  "status": "ready",
  "timestamp": "2025-12-01T10:30:00Z"
}
```

### Uptime Monitoring

Use **Better Uptime** (free tier) or **UptimeRobot**:
1. Monitor `https://api.quotepro.com/api/health`
2. Alert if down > 5 minutes
3. Check every 1 minute

---

## 5. Monitoring Dashboard

### Implementation

**Component**: `src/components/monitoring-dashboard.tsx`

### Features

✅ Service status (healthy/unhealthy)
✅ Uptime tracking
✅ CPU usage (real-time)
✅ Memory usage (with available MB)
✅ Disk usage (with free GB)
✅ Python version
✅ Auto-refresh (every 30s)

### Usage

Add to admin/settings page:
```tsx
import { MonitoringDashboard } from '@/components/monitoring-dashboard'

<MonitoringDashboard />
```

---

## 6. AI Usage Analytics

### Already Built! ✅

**Table**: `ai_quote_analysis`

Tracks:
- AI feature usage (quote_generation, optimization, upsells)
- Win probability predictions
- Suggestion acceptance
- Revenue impact
- Cost tracking

**Dashboard**: `src/components/ai/ai-analytics-dashboard.tsx`

---

## Monitoring Checklist

### Production Setup

- [ ] **Sentry DSN** configured (or leave empty)
- [ ] **Log level** set to INFO
- [ ] **JSON logs** enabled (`JSON_LOGS=true`)
- [ ] **Health endpoint** monitored (Better Uptime)
- [ ] **Web Vitals** tracked
- [ ] **Error alerts** configured (Sentry)
- [ ] **Monitoring dashboard** accessible to admins

### Development Setup

- [ ] **Sentry disabled** (no DSN or dev mode)
- [ ] **Colored console logs**
- [ ] **Web Vitals** logged to console
- [ ] **Health endpoints** tested

---

## Costs

### Free Tier Limits

**Sentry**:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month

**Vercel Analytics**:
- Unlimited (built-in with Vercel deployment)

**Better Uptime**:
- 1 monitor
- 3-minute checks
- Status page

**Total Cost**: **$0/month** to start!

---

## Monitoring Best Practices

### 1. Log Levels

**DEBUG**: Detailed diagnostic info (development only)
**INFO**: General informational messages (operations, requests)
**WARNING**: Something unexpected but handled (deprecated API, retries)
**ERROR**: Error occurred but app continues (failed to send email)
**CRITICAL**: Severe error, app may not function (database down)

### 2. What to Log

✅ **DO Log**:
- API requests (method, path, status, duration)
- Business events (quote generated, email sent)
- Errors with context
- Performance metrics
- User actions (authentication, quote creation)

❌ **DON'T Log**:
- Passwords, API keys, secrets
- PII (personally identifiable info) in production
- Credit card numbers
- Session tokens

### 3. Error Handling

```python
try:
    result = risky_operation()
    logger.info("Operation succeeded", extra={'extra_data': {'result': result}})
except Exception as e:
    logger.error(
        "Operation failed",
        exc_info=True,  # Include stack trace
        extra={
            'extra_data': {
                'input': input_data,
                'error_type': type(e).__name__,
            }
        }
    )
    raise  # Re-raise for proper error handling
```

### 4. Performance Monitoring

```python
import time

start = time.time()
result = expensive_operation()
duration = (time.time() - start) * 1000  # Convert to ms

logger.info(
    "Expensive operation completed",
    extra={'extra_data': {'duration_ms': round(duration, 2)}}
)
```

---

## Alerting

### Sentry Alerts

Automatically alerts on:
- New error types
- Error spikes (10x normal rate)
- Performance degradation

Configure in Sentry dashboard.

### Uptime Alerts

Set up in Better Uptime:
- Email on downtime
- Slack integration (optional)
- Status page for customers

### Custom Alerts

Monitor these metrics:
- Error rate > 5%
- Response time > 3s (p95)
- CPU > 80%
- Memory > 90%
- Disk > 95%

---

## Troubleshooting

### Logs Not Appearing

**Check**:
1. `LOG_LEVEL` environment variable
2. Logger initialized (`setup_logging()` called)
3. Using correct logger instance (`get_logger(__name__)`)

### Sentry Not Working

**Check**:
1. `NEXT_PUBLIC_SENTRY_DSN` set in `.env.local`
2. Not in development mode (Sentry disabled by default)
3. Check browser console for Sentry initialization
4. Verify DSN is correct

### Health Endpoint 500 Error

**Check**:
1. `psutil` installed (`pip install psutil`)
2. Permissions to read system metrics
3. Check server logs for exception

---

## Summary

✅ **Sentry** - Critical errors only (free tier)
✅ **Structured Logging** - JSON logs with context
✅ **Web Vitals** - Performance tracking
✅ **Health Endpoints** - Service monitoring
✅ **Monitoring Dashboard** - Internal metrics
✅ **AI Analytics** - Already built!

**Total Setup Time**: ~30 minutes
**Monthly Cost**: $0 (free tiers)
**Production Ready**: Yes!

Next: **Day 5 - Security Audit & Hardening**
