# 🔐 Supabase Setup Guide for QuoteBuilder Pro

Since you already have Google authentication enabled, here's how to configure everything for local testing:

---

## 1️⃣ Configure Redirect URLs

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**

2. Set **Site URL**:
   ```
   http://localhost:3000
   ```

3. Add **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000
   ```

4. For Google OAuth, also add these URLs in **Google Cloud Console** (if not already done):
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/callback`

---

## 2️⃣ Update Your .env.local

Make sure your `.env.local` has your actual Supabase credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI - Groq (get free key at console.groq.com)
GROQ_API_KEY=your_groq_key_or_leave_empty_for_now

# Optional (can add later)
OPENROUTER_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
DROPBOX_SIGN_API_KEY=
DROPBOX_SIGN_CLIENT_ID=
LEMON_SQUEEZY_API_KEY=
LEMON_SQUEEZY_STORE_ID=
LEMON_SQUEEZY_WEBHOOK_SECRET=

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find Supabase credentials:**
1. **URL & Anon Key**: Project Settings → API → Project URL and anon/public key
2. **Service Role Key**: Project Settings → API → service_role key (keep this secret!)

---

## 3️⃣ Run Database Migration

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Copy the entire content from: `supabase/migrations/001_initial_schema.sql`
4. Paste it into the SQL editor
5. Click **Run**

This creates:
- ✅ `companies` table
- ✅ `pricing_items` table
- ✅ `quotes` table
- ✅ `quote_items` table
- ✅ `signed_documents` table
- ✅ Row Level Security policies
- ✅ Indexes for performance

---

## 4️⃣ Create Storage Bucket

1. Go to **Storage** in Supabase
2. Click **New Bucket**
3. Name it: `logos`
4. Make it **Public** (toggle the switch)
5. Click **Create bucket**

This allows companies to upload their logos during onboarding.

---

## 5️⃣ Test the Setup

Now you can test locally at **http://localhost:3000**:

### Option 1: Google OAuth (Recommended)
1. Go to http://localhost:3000
2. Click "Continue with Google"
3. Sign in with your Google account
4. You'll be redirected to onboarding

### Option 2: Email/Password
1. Go to http://localhost:3000
2. Click "Don't have an account? Sign up"
3. Enter email and password
4. Check your email for confirmation link
5. After confirming, complete onboarding

---

## 6️⃣ Complete Onboarding Flow

After logging in (either method), you'll see:

**Step 1: Company Info**
- Enter your company name (e.g., "CoolAir HVAC")
- Upload a logo (optional)
- Click Continue

**Step 2: Pricing Setup**
- Choose "Use Default Pricing" (recommended)
- This adds 50 pre-filled items for contractors
- Click Continue

**Step 3: Ready!**
- Click "Create Your First Quote Now"
- You're taken to the dashboard

---

## 7️⃣ Test Quote Creation

1. Click **"New Quote"** button
2. Fill in customer info
3. Add job description (e.g., "Replace water heater with 50-gal unit")
4. Click **"Generate Quote with AI"**

**Note:** AI generation requires a Groq API key. Get one free at:
👉 https://console.groq.com

Without Groq API key, you can still:
- ✅ Create quotes manually
- ✅ Upload photos
- ✅ View dashboard
- ✅ See the UI/UX

---

## 🐛 Troubleshooting

### "Invalid login credentials"
- Make sure you've confirmed your email if using email/password signup
- For Google OAuth, check that redirect URLs are configured correctly

### "Failed to fetch"
- Verify your Supabase URL and anon key are correct
- Check that the URL doesn't have trailing slashes

### "Row Level Security policy violation"
- Make sure you ran the full SQL migration
- The migration includes all necessary RLS policies

### Google OAuth not working
- Verify redirect URLs in both Supabase AND Google Cloud Console
- Make sure Site URL is set to `http://localhost:3000`
- Check that Google OAuth is enabled in Supabase Authentication settings

### Database errors
- Ensure SQL migration completed successfully
- Check for any errors in the SQL Editor
- Verify all tables were created

---

## 📊 What You Can Test Now

✅ **Authentication**
- Sign in with Google
- Sign up with email/password
- Protected routes

✅ **Onboarding**
- Company setup
- Logo upload (to Supabase Storage)
- Default pricing items (50 items)

✅ **Dashboard**
- View metrics (empty initially)
- See company info
- Dark mode toggle

✅ **Quote Creation**
- Customer info form
- Photo uploads
- Voice-to-text button (UI only, needs implementation)
- Mobile-first design

✅ **With Groq API Key**
- AI-powered quote generation
- Smart line item matching
- Automatic upsells

---

## 🎯 Ready to Test!

Once you've:
1. ✅ Set redirect URLs in Supabase
2. ✅ Updated `.env.local` with your credentials
3. ✅ Run the SQL migration
4. ✅ Created the `logos` storage bucket

You're ready to go! The dev server should auto-reload when you update `.env.local`.

**Open:** http://localhost:3000

---

## 🚀 Next Steps

1. **Get Groq API Key** (Free, 2 minutes)
   - Go to https://console.groq.com
   - Create account
   - Generate API key
   - Add to `.env.local`

2. **Test AI Quote Generation**
   - Create a new quote
   - Use realistic contractor descriptions
   - See AI match items from pricing catalog

3. **Deploy to Production** (when ready)
   - See `DEPLOYMENT.md` for full guide
   - Update Supabase redirect URLs for production domain

---

Need help? Check the troubleshooting section above or the main README.md!
