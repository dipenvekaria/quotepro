# 🔥 IMMEDIATE ACTION REQUIRED - Fix 500 Error

## What's Happening

Your app is showing a **500 Internal Server Error** because the `profiles` table doesn't exist in your database yet.

## Why This Happened

I added code that queries the `profiles` table to show user names in the audit trail, but the table hasn't been created in your database yet. This is causing the 500 error.

## How to Fix (Takes 2 Minutes)

### Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Click on your **QuotePro** project
3. Click **"SQL Editor"** in the left sidebar (looks like `</>`)

### Step 2: Create New Query

1. Click the **"New Query"** button (top right)
2. **Delete any template code** that appears

### Step 3: Copy and Paste This SQL

Copy **ALL** of this SQL code:

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

### Step 4: Run the Query

1. Click the **"Run"** button (or press Cmd+Enter)
2. You should see: ✅ **"Success. No rows returned"**

### Step 5: Verify It Worked

In the same SQL Editor, paste this and click Run:

```sql
SELECT * FROM profiles;
```

You should see at least one row (your user profile).

### Step 6: Reload Your App

1. Go back to your browser with QuotePro open
2. **Hard reload**: Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows)
3. The 500 error should be **GONE**! ✅

---

## What If It Still Doesn't Work?

### If you get "relation already exists" error:
✅ **Good!** This means the table is already there. Skip to Step 6.

### If you get "permission denied":
1. Make sure you're on the correct Supabase project
2. Make sure you're logged in as the project owner
3. Try logging out and back into Supabase Dashboard

### If 500 error persists:
1. Check the browser console (F12) for new errors
2. Make sure you hard-reloaded (Cmd+Shift+R)
3. Try this SQL to confirm table exists:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'profiles';
   ```

---

## After Migration Works

Once this is applied, these features will work properly:

✅ **Internal Notes** - Will show "Notes saved by [Your Name]"  
✅ **AI Updates** - Will log who made changes in audit trail  
✅ **Audit Trail** - Will show user names instead of "User"  
✅ **No more 500 errors** - App will load normally  

---

## Optional: Set Your Full Name

After the migration, you can set your full name so it shows in the audit trail:

```sql
UPDATE profiles 
SET full_name = 'Your Full Name' 
WHERE id = auth.uid();
```

Replace `'Your Full Name'` with your actual name.

---

**⏱️ Time Required:** 2 minutes  
**⚠️ Urgency:** HIGH - App won't work without this  
**🎯 Difficulty:** Easy - Just copy/paste SQL  

**Next Step:** Go to Supabase Dashboard NOW and apply this SQL ⬆️
