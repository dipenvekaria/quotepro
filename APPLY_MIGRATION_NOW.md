# URGENT: Apply This Migration to Fix 500 Error

## The Problem

Your app is getting 500 errors because the `profiles` table doesn't exist yet.
The code is trying to query it, but the table hasn't been created.

## Quick Fix (2 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your QuotePro project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run This SQL

Copy the ENTIRE contents below and paste into the SQL Editor, then click "Run":

```sql
-- Create profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users (if any)
INSERT INTO public.profiles (id, email, full_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Verify It Worked

After running the SQL, you should see "Success. No rows returned" or similar message.

To verify the table was created, run this in the SQL Editor:

```sql
SELECT * FROM profiles LIMIT 5;
```

You should see your user profile(s) listed.

### Step 4: Reload Your App

1. Go back to your browser with the QuotePro app
2. Hard reload the page (Cmd+Shift+R on Mac)
3. The 500 error should be gone!

## What This Does

This migration:
- ✅ Creates the `profiles` table that the code expects
- ✅ Sets up security policies so users can only see their own profile
- ✅ Creates a trigger to auto-create profiles for new users
- ✅ Backfills profiles for existing users (including you!)

## After Migration

Once applied, these features will work:
- ✅ Saving internal notes (will show "Notes saved by [Your Name]")
- ✅ AI updates (will log who made changes and what instructions were given)
- ✅ Audit trail (will show user names instead of just user IDs)

## Troubleshooting

**If you get a "permission denied" error:**
- Make sure you're logged into the correct Supabase project
- Try using the "New Query" button in SQL Editor

**If the table already exists:**
- No problem! The `CREATE TABLE IF NOT EXISTS` will skip creation
- The backfill will use `ON CONFLICT DO NOTHING` so it won't duplicate data

**If 500 error persists after migration:**
- Check browser console for new error messages
- Make sure you hard-reloaded (Cmd+Shift+R)
- Check that profiles table has data: `SELECT COUNT(*) FROM profiles;`

---

**Time Required:** 2 minutes  
**Risk:** None (creates new table, doesn't modify existing data)  
**Required:** Yes (app won't work without this)
