# Update Supabase OAuth Redirect URLs

## Quick Fix for Google Login Redirect

Your Cloudflare Tunnel URL: `https://highways-coaches-statistics-douglas.trycloudflare.com`

### Steps to Update Supabase:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/ajljduisjyutbgjeucig

2. **Navigate to Authentication Settings**
   - Click on **Authentication** in left sidebar
   - Click on **URL Configuration**

3. **Update Redirect URLs**
   
   Add this URL to **Redirect URLs** (Site URL will auto-update):
   ```
   https://highways-coaches-statistics-douglas.trycloudflare.com/**
   ```

4. **Update Site URL**
   ```
   https://highways-coaches-statistics-douglas.trycloudflare.com
   ```

5. **Save Changes**

### What Changed:

**Before:**
- `https://mireille-castellated-nongrievously.ngrok-free.dev` (ngrok - bandwidth exceeded)

**After:**
- `https://highways-coaches-statistics-douglas.trycloudflare.com` (Cloudflare - unlimited)

### After Updating Supabase:

Restart your Next.js server to pick up the new environment variables:

```bash
# Stop current dev server (Ctrl+C)
# Then restart
npm run dev
```

Then Google login will redirect to your new Cloudflare URL!

---

## For Future Tunnel Restarts

When you restart the Cloudflare tunnel, you'll get a **new random URL**. You'll need to:

1. Update `.env.local` with new URL
2. Update Supabase redirect URLs
3. Restart Next.js

**To avoid this**, follow the "Advanced: Stable URLs" section in `CLOUDFLARE_TUNNEL.md` to get a permanent URL.

---

## Alternative: Use localhost for Development

For local development, you can add `http://localhost:3000/**` to Supabase redirect URLs and use:

```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then only use the tunnel URL when you need to share with others.
