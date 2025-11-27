# 🚨 PDF Generation 500 Error - Quick Fix

## The Problem
You're getting a **500 Internal Server Error** when generating PDFs. This is because the database setup isn't complete yet.

## ✅ The Solution (2 Steps - Takes 2 Minutes)

### Step 1: Add the `pdf_url` Column to Database

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to SQL Editor** (left sidebar)
3. **Click "New Query"**
4. **Paste this SQL** (from `supabase/migrations/009_add_pdf_url_to_quotes.sql`):

```sql
-- Add PDF URL column to quotes table

-- Add column for storing the generated PDF URL
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_pdf_url 
ON quotes(pdf_url) 
WHERE pdf_url IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN quotes.pdf_url IS 'Public URL to the generated PDF in Supabase Storage (quotes/{quote_id}/quote.pdf)';
```

5. **Click "Run"** (or press Cmd+Enter)
6. **Verify**: You should see "Success. No rows returned"

### Step 2: Create the Storage Bucket

1. **In Supabase Dashboard**, go to **Storage** (left sidebar)
2. **Click "New Bucket"**
3. **Configure bucket**:
   - Name: `quotes`
   - Public bucket: **✅ YES** (important!)
   - File size limit: 50MB (default is fine)
   - Allowed MIME types: Leave empty (all types)
4. **Click "Create Bucket"**

## 🧪 Test It Works

After completing both steps above:

1. **Reload your QuotePro app** (Cmd+R)
2. **Open any quote** (or create a new one)
3. **Click "Update Quote"** or **"Save as Draft"**
4. **Check the browser console** - you should now see:
   ```
   PDF generated: https://[your-project].supabase.co/storage/v1/object/public/quotes/...
   ```
5. **Click the URL** - you should see a beautiful professional PDF! 🎉

## 🔍 Diagnostic Tool (Optional)

If you want to verify the setup, run:

```bash
npx tsx scripts/check-pdf-setup.ts
```

This will check:
- ✅ Database column exists
- ✅ Storage bucket exists  
- ✅ Bucket is public
- ✅ Environment variables set

## 🐛 Still Getting Errors?

Check your terminal (where `npm run dev` is running) for detailed error messages. Common issues:

### Error: "column 'pdf_url' does not exist"
👉 **Solution**: You haven't run Step 1 above

### Error: "Bucket not found"
👉 **Solution**: You haven't completed Step 2 above

### Error: "Object (with role) missing required privileges"
👉 **Solution**: Make sure the bucket is set to **Public** in Step 2

### Error: "Invalid file type"
👉 **Solution**: This shouldn't happen, but verify bucket allows all MIME types

## 📊 What Happens Next

Once setup is complete, PDFs will automatically:
- ✅ Generate when you save any quote
- ✅ Regenerate when you update a quote
- ✅ Include company branding, customer details, itemized pricing
- ✅ Show Good/Better/Best tiers if available
- ✅ Highlight upsells in orange
- ✅ Embed job photos
- ✅ Display tax breakdown
- ✅ Include "Accept & Sign" button

## 💡 Pro Tips

- PDFs are cached - same quote ID always overwrites the same file
- Storage is on Supabase free tier - 1GB free (enough for ~5,000 PDFs)
- PDFs are publicly accessible (but hard to guess the URL)
- You can customize colors in `/src/components/QuotePDF.tsx`

## ⏱️ Timeline

- **Step 1** (SQL): 30 seconds
- **Step 2** (Bucket): 1 minute
- **Testing**: 30 seconds

**Total: 2 minutes** to go from 500 error to beautiful PDFs! 🚀
