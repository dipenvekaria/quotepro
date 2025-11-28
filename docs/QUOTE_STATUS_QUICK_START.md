# 🚀 Quick Setup: Quote Status Tracking

## What's New

You now have color-coded status badges showing where each quote is in the follow-up process:

- 🕐 **Draft** (Gray) - Not sent yet
- 📤 **Sent** (Blue) - Waiting for customer response
- 🔔 **1st Reminder** (Yellow) - First follow-up sent
- 🔔 **2nd Reminder** (Orange) - Second follow-up sent
- ❌ **Expired** (Red) - No response, quote expired
- ✅ **Accepted** (Green) - **Calendar icon enabled for scheduling!**

## 📋 Setup (2 Minutes)

### Step 1: Apply Database Migration

**Option A: Supabase Dashboard (Easiest)**
1. Go to https://supabase.com/dashboard
2. Open your QuotePro project
3. Click "SQL Editor" in sidebar
4. Copy and paste this SQL:

```sql
-- Add follow-up status tracking for quotes
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'draft' 
CHECK (followup_status IN (
  'draft',
  'sent',
  'reminder_1',
  'reminder_2',
  'expired',
  'accepted'
));

-- Add columns to track when reminders were sent
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_2_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE;

-- Add index for filtering by followup status
CREATE INDEX IF NOT EXISTS idx_quotes_followup_status ON quotes(followup_status);

-- Comments for clarity
COMMENT ON COLUMN quotes.followup_status IS 'Tracks customer follow-up journey: draft -> sent -> reminder_1 -> reminder_2 -> expired/accepted';
COMMENT ON COLUMN quotes.reminder_1_sent_at IS 'Timestamp when first reminder was sent';
COMMENT ON COLUMN quotes.reminder_2_sent_at IS 'Timestamp when second reminder was sent';
COMMENT ON COLUMN quotes.accepted_at IS 'Timestamp when customer accepted the quote';
COMMENT ON COLUMN quotes.expired_at IS 'Timestamp when quote was marked as expired';
```

5. Click **"Run"**
6. Should see: "Success. No rows returned"

**Option B: Supabase CLI**
```bash
npx supabase db push
```

### Step 2: Hard Reload Browser

Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)

### Step 3: Test It!

1. Go to Leads page
2. Look at your quotes - you should see colored status badges!
3. Find a quote with "Accepted" status
4. Notice the calendar icon is **bright blue** and clickable
5. Other quotes have **grayed out** calendar icons

## 🎨 What You'll See

### Quotes List - Before
```
John Doe
Replace water heater
Quoted  $1,250  2d ago
```

### Quotes List - After
```
John Doe
Replace water heater
[🕐 Draft]  $1,250  2d ago         (gray badge)

Jane Smith
Full system tune-up
[📤 Sent]  $450  1d ago            (blue badge)

Bob Johnson
Sewer line repair
[🔔 1st Reminder]  $2,100  3d ago  (yellow badge)

Alice Brown
Emergency fix
[✅ Accepted]  $850  5d ago        (green badge, calendar enabled!)
```

## 📅 Calendar Icon Behavior

### Before
- Calendar icon always showed the same (blue)
- Could click on any quote

### After
- **Grayed out** (disabled) for Draft, Sent, Reminders, Expired
- **Bright blue** (enabled) ONLY for Accepted quotes
- Tooltip tells you why: "Quote must be accepted first"

## 🔧 Manually Testing Statuses

To see all the colors, you can manually update a quote status:

```sql
-- In Supabase SQL Editor
UPDATE quotes 
SET followup_status = 'accepted' 
WHERE id = 'your-quote-id-here';
```

Try different statuses:
- `'draft'` - Gray
- `'sent'` - Blue
- `'reminder_1'` - Yellow
- `'reminder_2'` - Orange
- `'expired'` - Red
- `'accepted'` - Green

## ❓ Troubleshooting

### Migration fails with "column already exists"
✅ That's fine! The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### Don't see colored badges after reload
1. Check migration ran successfully
2. Hard reload again (Cmd+Shift+R)
3. Check browser console (F12) for errors

### All quotes show gray "Draft"
✅ That's correct! New feature defaults all existing quotes to "draft"
- Manually update important quotes to "sent" or "accepted"
- Future quotes will be updated as you send them

### Calendar icon not changing
1. Check quote has `followup_status = 'accepted'`
2. Hard reload browser
3. Check console for React errors

## 📊 Next Steps

Once this is working, you can:

1. **Add status update buttons** to quote detail page
2. **Auto-update status** when sending emails
3. **Track metrics** by status
4. **Filter quotes** by status
5. **Send automated reminders** based on status

---

**Files Changed:**
- ✅ `supabase/migrations/013_add_quote_followup_status.sql` - Database schema
- ✅ `src/components/quote-status-badge.tsx` - New component
- ✅ `src/components/leads-and-quotes.tsx` - Updated UI

**Time:** 2 minutes  
**Risk:** Low (only adds new columns, doesn't modify existing data)  
**Ready:** Apply migration now! 🚀
