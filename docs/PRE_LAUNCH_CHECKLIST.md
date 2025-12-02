# QuotePro Pre-Launch Checklist

Complete checklist to verify production readiness before going live.

**Last Updated:** December 2025  
**Target Launch:** [Set your date]  
**Environment:** Production

---

## Security Review ✅

### Authentication & Authorization

- [ ] **Supabase Authentication**
  - [ ] Sign up works (email verification)
  - [ ] Sign in works (email/password)
  - [ ] Password reset works
  - [ ] Session persistence works
  - [ ] Logout works and clears session
  - [ ] Multi-company user access works

- [ ] **JWT Authentication (Backend)**
  - [ ] `SUPABASE_JWT_SECRET` configured in production
  - [ ] JWT verification working on all protected routes
  - [ ] Invalid tokens return 401
  - [ ] Expired tokens return 401
  - [ ] Missing tokens return 401
  - [ ] Token included in Authorization header

- [ ] **Company Access Control**
  - [ ] Users can only access their company data
  - [ ] Cross-company requests return 403
  - [ ] Company ID validation on all requests
  - [ ] `verify_company_access()` called on mutations

- [ ] **RLS Policies**
  - [ ] All 16 tables have RLS enabled
  - [ ] Companies table: users see only their company
  - [ ] Quotes table: users see only their company quotes
  - [ ] Customers table: company-scoped access
  - [ ] Pricing items: company-scoped access
  - [ ] AI tables: company-scoped access
  - [ ] Audit trail: company-scoped access
  - [ ] Test multi-tenant isolation (critical!)

### Rate Limiting & DDoS Protection

- [ ] **Rate Limiting Configured**
  - [ ] Slowapi middleware integrated
  - [ ] AI generation: 10/minute limit
  - [ ] AI optimization: 20/minute limit
  - [ ] Bulk catalog: 1/minute limit
  - [ ] Standard endpoints: 60/minute limit
  - [ ] Health checks: 100/minute limit
  - [ ] 429 responses include retry-after header
  - [ ] Rate limit violations logged

- [ ] **DDoS Protection**
  - [ ] Vercel DDoS protection enabled (automatic)
  - [ ] Railway/Render DDoS protection enabled
  - [ ] Cloudflare enabled (optional)

### Input Validation & Sanitization

- [ ] **AI Prompt Validation**
  - [ ] Injection patterns blocked ("ignore previous")
  - [ ] HTML tags stripped from prompts
  - [ ] Prompt length limited (5000 chars)
  - [ ] Suspicious content returns 400
  - [ ] `sanitize_ai_prompt()` used on all AI inputs

- [ ] **HTML Sanitization**
  - [ ] XSS protection on all text inputs
  - [ ] `sanitize_html()` used on customer data
  - [ ] Script tags removed
  - [ ] Event handlers removed (onclick, onerror)

- [ ] **File Upload Validation**
  - [ ] Extension whitelist (.csv, .xlsx only)
  - [ ] File size limit (10MB)
  - [ ] MIME type checking
  - [ ] Filename sanitization (no ../)
  - [ ] `validate_file_upload()` used

- [ ] **Form Validation**
  - [ ] Email format validated
  - [ ] Phone format validated
  - [ ] UUID format validated
  - [ ] Numeric ranges validated
  - [ ] Required fields enforced

### CORS Configuration

- [ ] **Production CORS**
  - [ ] `ALLOWED_ORIGINS` set to production domain only
  - [ ] No wildcard origins (`*`)
  - [ ] No wildcard methods (`*`)
  - [ ] No wildcard headers (`*`)
  - [ ] Explicit methods: GET, POST, PUT, DELETE, PATCH
  - [ ] Explicit headers: Authorization, Content-Type, X-Request-ID
  - [ ] Credentials allowed (true)
  - [ ] Test cross-origin requests work

### Secrets Management

- [ ] **Environment Variables**
  - [ ] All secrets in GitHub encrypted secrets (not code)
  - [ ] All secrets in Vercel environment variables
  - [ ] All secrets in Railway/Render environment
  - [ ] No secrets in `.env` files committed to git
  - [ ] `.env.example` updated with all required vars
  - [ ] Service role key only in backend (never frontend)

- [ ] **Production Secrets Rotated**
  - [ ] New `GEMINI_API_KEY` for production
  - [ ] New `SUPABASE_SERVICE_ROLE_KEY` for production
  - [ ] New `SUPABASE_JWT_SECRET` for production
  - [ ] New `VERCEL_TOKEN` if needed
  - [ ] Old development secrets revoked

- [ ] **Secret Storage**
  - [ ] GitHub secrets encrypted
  - [ ] Vercel secrets encrypted
  - [ ] Railway/Render secrets encrypted
  - [ ] No secrets in logs
  - [ ] No secrets in error messages

### HTTPS & Certificates

- [ ] **HTTPS Enabled**
  - [ ] Vercel HTTPS automatic (✅)
  - [ ] Railway/Render HTTPS automatic (✅)
  - [ ] Custom domain HTTPS configured (if applicable)
  - [ ] All HTTP redirects to HTTPS
  - [ ] No mixed content warnings

- [ ] **Security Headers**
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] Content-Security-Policy (optional but recommended)
  - [ ] *Note: Add via Vercel headers config or reverse proxy*

---

## Performance Validation ✅

### Load Testing

- [ ] **Concurrent Users**
  - [ ] Test with 10 concurrent users
  - [ ] Test with 50 concurrent users
  - [ ] Test with 100 concurrent users (target capacity)
  - [ ] Response times < 2s for most requests
  - [ ] No timeouts under normal load

- [ ] **AI Endpoints (Expensive)**
  - [ ] Quote generation < 10s
  - [ ] Quote optimization < 8s
  - [ ] Upsell suggestions < 8s
  - [ ] Catalog indexing handles large files (1000+ items)
  - [ ] Rate limiting prevents abuse

- [ ] **Database Queries**
  - [ ] Quote list loads < 1s
  - [ ] Customer list loads < 1s
  - [ ] Catalog search < 500ms
  - [ ] Dashboard stats < 1s
  - [ ] No N+1 queries (check logs)
  - [ ] Indexes on foreign keys
  - [ ] Indexes on frequently queried columns

### Frontend Performance

- [ ] **Web Vitals**
  - [ ] FCP (First Contentful Paint) < 1.8s
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] CLS (Cumulative Layout Shift) < 0.1
  - [ ] FID (First Input Delay) < 100ms
  - [ ] TTFB (Time to First Byte) < 800ms
  - [ ] INP (Interaction to Next Paint) < 200ms

- [ ] **Lighthouse Score**
  - [ ] Performance: > 90
  - [ ] Accessibility: > 90
  - [ ] Best Practices: > 90
  - [ ] SEO: > 90

- [ ] **Bundle Size**
  - [ ] Main bundle < 300KB gzipped
  - [ ] No duplicate dependencies
  - [ ] Code splitting implemented
  - [ ] Lazy loading for heavy components

### Backend Performance

- [ ] **API Response Times**
  - [ ] Health endpoint < 100ms
  - [ ] CRUD operations < 500ms
  - [ ] Search endpoints < 1s
  - [ ] AI endpoints < 10s (acceptable due to LLM)

- [ ] **Resource Usage**
  - [ ] Memory usage stable (no leaks)
  - [ ] CPU usage < 50% average
  - [ ] Database connections < 20
  - [ ] No connection pool exhaustion

### Caching

- [ ] **Frontend Caching**
  - [ ] Static assets cached (immutable)
  - [ ] API responses cached where appropriate
  - [ ] React Query cache configured
  - [ ] Service worker for offline (optional)

- [ ] **Backend Caching**
  - [ ] Catalog embeddings cached in database
  - [ ] Similar quote search results cached
  - [ ] Company settings cached

---

## Functionality Testing ✅

### Core Features

- [ ] **Quote Management**
  - [ ] Create quote (manual)
  - [ ] Create quote (AI-generated)
  - [ ] Edit quote
  - [ ] Update quote with AI suggestions
  - [ ] Delete quote
  - [ ] Search quotes
  - [ ] Filter quotes by status
  - [ ] Sort quotes

- [ ] **AI Features**
  - [ ] AI quote generation from job description
  - [ ] AI quote optimization (win probability)
  - [ ] AI upsell suggestions
  - [ ] RAG search (finds similar past quotes)
  - [ ] Catalog item recommendations

- [ ] **Customer Management**
  - [ ] Create customer
  - [ ] Edit customer
  - [ ] Delete customer
  - [ ] Search customers
  - [ ] Customer history view

- [ ] **Catalog Management**
  - [ ] Add pricing item
  - [ ] Edit pricing item
  - [ ] Delete pricing item
  - [ ] Bulk upload CSV/Excel
  - [ ] Vector embedding indexing
  - [ ] Search catalog items

- [ ] **Public Quote Viewer**
  - [ ] Public link generation
  - [ ] Quote view (read-only)
  - [ ] Accept/reject buttons
  - [ ] Email notifications
  - [ ] Status updates

- [ ] **PDF Generation**
  - [ ] Generate PDF from quote
  - [ ] PDF includes all line items
  - [ ] PDF formatting correct
  - [ ] Company logo displayed
  - [ ] Download works

- [ ] **Audit Trail**
  - [ ] All changes logged
  - [ ] User attribution correct
  - [ ] Timestamps accurate
  - [ ] Change history viewable
  - [ ] Filtering works

### User Flows

- [ ] **New User Onboarding**
  - [ ] Sign up
  - [ ] Email verification
  - [ ] Company creation
  - [ ] First quote creation
  - [ ] Catalog setup

- [ ] **Daily Workflow**
  - [ ] Login
  - [ ] View dashboard
  - [ ] Create quote with AI
  - [ ] Send to customer
  - [ ] Track status
  - [ ] Generate PDF
  - [ ] Logout

- [ ] **Mobile Experience**
  - [ ] Responsive on iPhone
  - [ ] Responsive on iPad
  - [ ] Responsive on Android
  - [ ] Touch targets large enough
  - [ ] No horizontal scrolling

---

## Monitoring & Observability ✅

### Error Tracking

- [ ] **Sentry Configuration (Optional)**
  - [ ] Sentry project created
  - [ ] `SENTRY_DSN` configured
  - [ ] Frontend error tracking works
  - [ ] Backend error tracking works
  - [ ] Source maps uploaded
  - [ ] Alerts configured

- [ ] **Error Handling**
  - [ ] Error boundaries catch React errors
  - [ ] Network errors show user-friendly messages
  - [ ] 500 errors logged to Sentry
  - [ ] 404 errors handled gracefully
  - [ ] API errors show toasts

### Logging

- [ ] **Structured Logging**
  - [ ] JSON logs enabled in production (`JSON_LOGS=true`)
  - [ ] Request IDs in all log entries
  - [ ] Log level set to INFO or WARNING
  - [ ] No sensitive data in logs (passwords, tokens)
  - [ ] Performance timing logged

- [ ] **Log Access**
  - [ ] Railway/Render logs accessible
  - [ ] Vercel logs accessible
  - [ ] Log retention configured
  - [ ] Team has access to logs

### Health Checks

- [ ] **Backend Health Endpoints**
  - [ ] `/api/health` returns 200
  - [ ] `/api/health/detailed` shows metrics
  - [ ] `/api/metrics` (Prometheus format)
  - [ ] `/api/ready` for readiness probe

- [ ] **Monitoring Dashboard**
  - [ ] CPU usage visible
  - [ ] Memory usage visible
  - [ ] Disk usage visible
  - [ ] Uptime tracked
  - [ ] Response times tracked

### Analytics

- [ ] **Vercel Analytics**
  - [ ] Analytics enabled
  - [ ] Web Vitals tracked
  - [ ] Page views tracked
  - [ ] Team has access

- [ ] **AI Analytics**
  - [ ] AI feature usage tracked
  - [ ] Win rate tracked
  - [ ] ROI calculated
  - [ ] Costs tracked

---

## Database & Data ✅

### Migrations

- [ ] **Production Migrations**
  - [ ] All migrations applied
  - [ ] Migration status verified (`supabase migration list`)
  - [ ] No pending migrations
  - [ ] RLS policies active
  - [ ] Constraints enforced

- [ ] **Backup**
  - [ ] Supabase automatic backups enabled (daily)
  - [ ] Point-in-time recovery available
  - [ ] Backup restoration tested
  - [ ] Manual backup taken before launch

- [ ] **Data Integrity**
  - [ ] Foreign keys enforced
  - [ ] NOT NULL constraints enforced
  - [ ] Unique constraints enforced
  - [ ] Check constraints enforced
  - [ ] Default values correct

### Database Performance

- [ ] **Indexes**
  - [ ] Indexes on foreign keys
  - [ ] Indexes on frequently queried columns
  - [ ] Vector indexes on embeddings
  - [ ] No missing indexes (check slow queries)

- [ ] **Connection Pooling**
  - [ ] Supabase connection pooler enabled
  - [ ] Max connections configured
  - [ ] No connection leaks

---

## Deployment & CI/CD ✅

### GitHub Actions

- [ ] **Test Workflow**
  - [ ] Runs on every push
  - [ ] Frontend tests pass
  - [ ] Backend tests pass
  - [ ] Security scan clean
  - [ ] Coverage > 70%

- [ ] **Deploy Workflow**
  - [ ] Deploys to production on main push
  - [ ] Tests run before deploy
  - [ ] Migrations run automatically
  - [ ] Health checks pass
  - [ ] Rollback on failure

### Environments

- [ ] **Development**
  - [ ] Local environment working
  - [ ] Uses development Supabase project
  - [ ] `.env.local` configured

- [ ] **Staging**
  - [ ] Staging environment deployed
  - [ ] Uses staging Supabase project
  - [ ] GitHub secrets configured
  - [ ] Testing completed on staging

- [ ] **Production**
  - [ ] Production environment deployed
  - [ ] Uses production Supabase project
  - [ ] GitHub secrets configured
  - [ ] Required reviewers set (1+)
  - [ ] Manual approval before deploy

### Infrastructure

- [ ] **Frontend (Vercel)**
  - [ ] Project deployed
  - [ ] Custom domain configured (optional)
  - [ ] HTTPS enabled
  - [ ] Environment variables set
  - [ ] Build optimizations enabled

- [ ] **Backend (Railway/Render)**
  - [ ] Service deployed
  - [ ] Health check configured
  - [ ] Environment variables set
  - [ ] Auto-scaling enabled (if paid plan)
  - [ ] Restart policy configured

---

## Documentation ✅

- [ ] **User Documentation**
  - [ ] README updated
  - [ ] Quick start guide
  - [ ] Feature documentation
  - [ ] FAQ

- [ ] **Developer Documentation**
  - [ ] Architecture docs
  - [ ] API documentation (Swagger)
  - [ ] Deployment guide
  - [ ] Troubleshooting guide

- [ ] **Operations Documentation**
  - [ ] Launch runbook
  - [ ] Rollback procedures
  - [ ] Monitoring guide
  - [ ] Emergency contacts

---

## Team Readiness ✅

- [ ] **Access & Permissions**
  - [ ] All team members have GitHub access
  - [ ] All team members have Vercel access
  - [ ] All team members have Railway/Render access
  - [ ] All team members have Supabase access
  - [ ] Emergency contacts documented

- [ ] **Training**
  - [ ] Team trained on QuotePro features
  - [ ] Team knows how to access logs
  - [ ] Team knows rollback procedures
  - [ ] Team knows emergency procedures

- [ ] **Communication**
  - [ ] Launch timeline communicated
  - [ ] Slack/email channel set up
  - [ ] On-call rotation defined (if needed)
  - [ ] Escalation path defined

---

## Legal & Compliance ✅

- [ ] **Terms of Service**
  - [ ] Terms page created
  - [ ] Privacy policy page created
  - [ ] Cookie policy (if applicable)
  - [ ] GDPR compliance (if applicable)

- [ ] **Data Protection**
  - [ ] User data encrypted at rest (Supabase default)
  - [ ] User data encrypted in transit (HTTPS)
  - [ ] Data retention policy defined
  - [ ] Data export capability (optional)

- [ ] **Licensing**
  - [ ] Third-party licenses reviewed
  - [ ] Open source licenses compliant
  - [ ] API keys properly licensed

---

## Final Checks ✅

- [ ] **Smoke Testing**
  - [ ] Can sign up new user
  - [ ] Can log in existing user
  - [ ] Can create quote
  - [ ] Can generate AI quote
  - [ ] Can send quote to customer
  - [ ] Can accept quote (public link)
  - [ ] Can generate PDF
  - [ ] Can logout

- [ ] **Cross-Browser Testing**
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)
  - [ ] Mobile Safari (iOS)
  - [ ] Mobile Chrome (Android)

- [ ] **Accessibility**
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible
  - [ ] Color contrast sufficient
  - [ ] Focus indicators visible
  - [ ] Alt text on images

- [ ] **SEO (if public site)**
  - [ ] Meta tags configured
  - [ ] Sitemap generated
  - [ ] robots.txt configured
  - [ ] Open Graph tags
  - [ ] Twitter Card tags

---

## Launch Day Checklist ✅

- [ ] **Pre-Launch (T-24 hours)**
  - [ ] All above checklists completed
  - [ ] Staging thoroughly tested
  - [ ] Team briefed on launch plan
  - [ ] Rollback plan reviewed
  - [ ] Monitoring dashboards open

- [ ] **Launch (T-0)**
  - [ ] Deploy to production
  - [ ] Verify health checks pass
  - [ ] Verify frontend accessible
  - [ ] Verify backend accessible
  - [ ] Run smoke tests
  - [ ] Monitor error rates

- [ ] **Post-Launch (T+1 hour)**
  - [ ] Monitor error rates (should be low)
  - [ ] Monitor response times (should be fast)
  - [ ] Monitor user signups
  - [ ] Check logs for issues
  - [ ] Team on standby

- [ ] **Post-Launch (T+24 hours)**
  - [ ] Review analytics
  - [ ] Review error logs
  - [ ] Review user feedback
  - [ ] Address urgent issues
  - [ ] Plan next iteration

---

## Success Criteria

**Launch is successful if:**
- ✅ Uptime > 99% in first 24 hours
- ✅ Error rate < 1%
- ✅ P95 response time < 2s
- ✅ No critical security issues
- ✅ Users can complete core workflows
- ✅ No data loss
- ✅ Rollback not needed

**If any of these fail, consider rollback.**

---

## Emergency Contacts

**On-Call Team:**
- Primary: [Your name] - [Your phone]
- Secondary: [Team member] - [Phone]

**Escalation:**
- Engineering Lead: [Name] - [Phone]
- CTO: [Name] - [Phone]

**Service Contacts:**
- Vercel Support: support@vercel.com
- Railway Support: help@railway.app
- Supabase Support: support@supabase.com

**Incident Response:**
1. Identify issue
2. Check monitoring/logs
3. Assess severity
4. Communicate to team
5. Execute rollback if critical
6. Fix and redeploy
7. Postmortem

---

## Notes

- **This is a living document** - update as you go
- **Don't skip items** - each is important
- **Test on staging first** - always
- **Have rollback plan ready** - hope you don't need it
- **Monitor closely post-launch** - first 24 hours critical

**You've got this!** 🚀
