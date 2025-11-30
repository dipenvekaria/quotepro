# HOW TO APPLY MIGRATIONS TO SUPABASE CLOUD

Since you're using Supabase Cloud (not local Docker), you have 3 options to apply migrations:

---

## ✅ **OPTION 1: Supabase Dashboard (Easiest)**

1. **Go to your Supabase project dashboard:**
   - https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar

3. **Copy migration 020 content:**
   - Open `/supabase/migrations/020_enable_pgvector.sql`
   - Copy all content (Ctrl/Cmd + A, Ctrl/Cmd + C)

4. **Paste and run:**
   - Paste into SQL Editor
   - Click "RUN" button
   - Should see: "✅ pgvector extension enabled successfully"

5. **Verify:**
   - Run this query:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
   - Should return one row with vector extension info

---

## ✅ **OPTION 2: Supabase CLI (Direct Connection)**

1. **Link your project:**
   ```bash
   cd /Users/dipen/code/quotepro
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. **Push migration:**
   ```bash
   supabase db push
   ```

This will apply all unapplied migrations (including 020).

---

## ✅ **OPTION 3: GitHub Integration (Automated)**

If you have Supabase GitHub integration enabled:

1. **Migrations apply automatically on push to main**
2. **Check deployment status in Supabase Dashboard**
3. **Verify extension enabled**

---

## 📋 **VERIFICATION CHECKLIST**

After applying migration 020, verify:

- [ ] Run: `SELECT * FROM pg_extension WHERE extname = 'vector';`
  - Should return: `vector | 0.8.0 | ✅ Ready for AI embeddings`

- [ ] Test vector operations:
  ```sql
  SELECT '[1,2,3]'::vector <=> '[1,2,3]'::vector AS cosine_distance;
  ```
  - Should return: `0` (identical vectors)

- [ ] Test different vectors:
  ```sql
  SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector AS cosine_distance;
  ```
  - Should return: `1` (orthogonal vectors)

---

## 🎯 **WHICH OPTION TO USE?**

**For now (testing):** Use **Option 1** (Dashboard) - fastest and visual feedback

**For production:** Use **Option 2** (CLI) - proper migration tracking

**If already set up:** Use **Option 3** (GitHub) - fully automated

---

## 🆘 **TROUBLESHOOTING**

### **Issue: "extension vector is not available"**
**Solution:** Contact Supabase support - pgvector should be available on all paid plans

### **Issue: "permission denied to create extension"**
**Solution:** You need database owner permissions. Check your user role.

### **Issue: Migration already applied**
**No problem!** The migration uses `CREATE EXTENSION IF NOT EXISTS`, so it's safe to run multiple times.

---

**Once verified, let me know and we'll create migration 021!** 🚀
