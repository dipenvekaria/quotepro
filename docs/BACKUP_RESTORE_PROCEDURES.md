# DATABASE BACKUP & RESTORE PROCEDURES

## Overview
Production-ready backup and restore procedures for QuotePro database.

---

## 🔄 Backup Strategy

### Automated Backups (Supabase)
Supabase provides automatic backups:
- **Daily backups:** Retained for 7 days (free tier) or 30 days (pro)
- **Point-in-time recovery (PITR):** Available on Pro plan
- **Location:** Managed by Supabase, stored securely

**To verify backups:**
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Confirm daily backups are running
4. Note retention period

### Manual Backup (On-Demand)

#### Full Database Backup
```bash
# Using Supabase CLI
npx supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# Or direct pg_dump (requires connection string)
pg_dump "postgresql://..." > backup-$(date +%Y%m%d-%H%M%S).sql
```

#### Table-Specific Backup
```bash
# Backup specific tables
npx supabase db dump --data-only --table companies,quotes,line_items -f data-backup.sql

# Backup schema only
npx supabase db dump --schema-only -f schema-backup.sql
```

#### Embeddings Backup (Large)
```bash
# Separate backup for embeddings (can be large)
npx supabase db dump --table document_embeddings -f embeddings-backup.sql
```

---

## 📥 Restore Procedures

### From Supabase Automatic Backup
1. Go to Supabase Dashboard → Database → Backups
2. Select backup to restore
3. Click "Restore" (creates new project or overwrites current)
4. Wait for restoration (can take several minutes)
5. Verify data integrity

### From Manual SQL Backup

#### Full Restore
```bash
# Using Supabase CLI
npx supabase db reset --db-url "postgresql://..."
psql "postgresql://..." < backup-20250101-120000.sql

# Or direct restore
psql "postgresql://..." < backup.sql
```

#### Selective Table Restore
```bash
# Extract specific table from backup
pg_restore -t quotes backup.sql | psql "postgresql://..."

# Or restore only data (preserve existing schema)
psql "postgresql://..." < data-backup.sql
```

---

## 🚨 Disaster Recovery

### Scenario 1: Data Corruption
**Symptoms:** Invalid data, missing records, corrupted relationships

**Steps:**
1. Identify corruption scope
   ```bash
   python scripts/validate-data.py
   ```
2. Determine last known good backup
3. Restore from backup (see above)
4. Verify data integrity
   ```bash
   python scripts/db-health-check.py
   ```
5. Re-run migrations if needed
   ```bash
   npx supabase db push
   ```

### Scenario 2: Accidental Data Deletion
**Symptoms:** Missing quotes, companies, or pricing items

**Steps:**
1. **Stop all writes immediately** (put app in read-only mode)
2. Create current state backup
   ```bash
   npx supabase db dump -f pre-restore-$(date +%Y%m%d-%H%M%S).sql
   ```
3. Restore from most recent backup
4. Verify restored data
5. Resume normal operations

### Scenario 3: Migration Failure
**Symptoms:** Migration errors, schema inconsistencies

**Steps:**
1. Check migration status
   ```bash
   npx supabase migration list
   ```
2. Rollback failed migration
   ```sql
   -- Connect to database
   -- Drop tables/columns created by failed migration
   -- Restore schema from backup if needed
   ```
3. Fix migration SQL
4. Re-run migration
   ```bash
   npx supabase db push
   ```

---

## 🔍 Pre-Restore Checklist

Before restoring from backup:

- [ ] Identify root cause of issue
- [ ] Create backup of current state (even if corrupted)
- [ ] Notify users of downtime
- [ ] Determine data loss window (time between backup and issue)
- [ ] Have rollback plan if restore fails
- [ ] Verify backup file integrity
- [ ] Test restore on staging environment first (if available)

---

## 📋 Post-Restore Verification

After restoring from backup:

1. **Run health check**
   ```bash
   python scripts/db-health-check.py
   ```

2. **Validate data**
   ```bash
   python scripts/validate-data.py
   ```

3. **Test critical workflows**
   - User authentication
   - Quote creation
   - AI features (optimizer, upsell)
   - Settings updates

4. **Check record counts**
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM companies) as companies,
     (SELECT COUNT(*) FROM quotes) as quotes,
     (SELECT COUNT(*) FROM line_items) as line_items,
     (SELECT COUNT(*) FROM pricing_items) as pricing_items,
     (SELECT COUNT(*) FROM document_embeddings) as embeddings;
   ```

5. **Verify recent data**
   ```sql
   -- Check most recent quotes
   SELECT id, created_at, customer_name, status
   FROM quotes
   ORDER BY created_at DESC
   LIMIT 10;
   ```

---

## 📅 Backup Schedule (Production)

### Recommended Schedule:
- **Automated daily:** 2 AM UTC (Supabase automatic)
- **Pre-deployment:** Before every production deploy
- **Weekly full backup:** Sunday 3 AM UTC (manual, stored off-platform)
- **Before migrations:** Always backup before schema changes

### Retention Policy:
- **Daily backups:** 7 days
- **Weekly backups:** 30 days
- **Monthly backups:** 12 months
- **Pre-migration backups:** Forever (or until migration verified stable)

---

## 💾 Off-Platform Backup Storage

For extra safety, store backups outside Supabase:

### S3/Cloud Storage
```bash
# Backup and upload to S3
npx supabase db dump -f backup.sql
aws s3 cp backup.sql s3://quotepro-backups/$(date +%Y%m%d)-backup.sql
```

### Local Storage (Encrypted)
```bash
# Create encrypted backup
npx supabase db dump -f backup.sql
gpg --encrypt --recipient admin@quotepro.com backup.sql
mv backup.sql.gpg ~/backups/quotepro/
```

---

## 🧪 Testing Restore Procedures

**Test restore quarterly:**

1. Create test Supabase project
2. Restore latest production backup
3. Run full test suite
4. Verify all features work
5. Document any issues
6. Update restore procedures if needed

**Test command:**
```bash
# 1. Get connection string for test project
# 2. Restore backup
psql "postgresql://test-connection-string" < production-backup.sql
# 3. Run tests
npm run test
python scripts/db-health-check.py
```

---

## 📞 Emergency Contacts

**In case of critical data loss:**

1. **Supabase Support:** support@supabase.com (Pro plan)
2. **Database Admin:** [Your DBA contact]
3. **DevOps Lead:** [Your DevOps contact]

**Response Time:**
- Critical (data loss): < 15 minutes
- High (corruption): < 1 hour
- Medium (performance): < 4 hours

---

## 📝 Backup Log Template

Keep a log of all manual backups:

```
Date: 2025-01-01
Time: 14:30 UTC
Type: Pre-migration backup
Filename: backup-20250101-143000.sql
Size: 250 MB
Reason: Before applying AI analytics migration
Verified: Yes
Stored: S3 + Local
Retention: Permanent
```

---

## 🎯 Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

### Target Metrics:
- **RTO (Recovery Time):** < 1 hour for critical data loss
- **RPO (Data Loss Window):** < 24 hours (daily backups)
- **PITR RPO:** < 5 minutes (if Pro plan enabled)

### Meeting Targets:
- Automated daily backups meet 24-hour RPO
- Manual backups before critical operations
- Consider Pro plan with PITR for stricter RPO

---

## ✅ Backup Verification Checklist

Run this monthly to ensure backups are working:

- [ ] Verify automated backups are running daily
- [ ] Test manual backup command works
- [ ] Verify backup file size is reasonable (not 0 bytes)
- [ ] Test restore on staging/test environment
- [ ] Confirm off-platform backups are uploading
- [ ] Check backup retention is configured correctly
- [ ] Review and update emergency procedures
- [ ] Train team on restore procedures

---

*Last updated: 2025-01-01*
*Next review: 2025-02-01*
