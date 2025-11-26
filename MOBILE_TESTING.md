# Quick Solution: Mobile Testing with Google OAuth

## The Real Problem
- ✅ `localhost:3000` works on your Mac
- ❌ `192.168.0.100:3000` doesn't work on phone because **Google OAuth blocks raw IP addresses**

## Quick Solution: Use localhost.run (Free Tunnel)

This is the **fastest** way to test on your phone:

### Step 1: Start localhost.run Tunnel

In a new terminal:
```bash
ssh -R 80:localhost:3000 nokey@localhost.run
```

You'll see output like:
```
** your url is: https://abc123-def.lhr.life **
```

### Step 2: Copy that URL and update .env.local

```env
NEXT_PUBLIC_APP_URL=https://abc123-def.lhr.life
NEXT_PUBLIC_SITE_URL=https://abc123-def.lhr.life
```

### Step 3: Update Google OAuth

**Authorized JavaScript origins:**
```
https://abc123-def.lhr.life
```

**Authorized redirect URIs:**
```
https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
https://abc123-def.lhr.life/auth/callback
```

### Step 4: Update Supabase

**Site URL:**
```
https://abc123-def.lhr.life
```

**Redirect URLs:**
```
https://abc123-def.lhr.life/*
```

### Step 5: Restart Dev Server

```bash
npm run dev
```

### Step 6: Test on Phone

Open on your phone:
```
https://abc123-def.lhr.life
```

---

## Alternative: Use ngrok (More Stable)

If localhost.run doesn't work:

### Step 1: Install ngrok
```bash
brew install ngrok
```

### Step 2: Start ngrok
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### Step 3: Follow same steps as above with the ngrok URL

---

## For Desktop Development (Keep Using localhost)

**For working on your Mac**, keep these settings:

### .env.local
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Google OAuth
**Authorized JavaScript origins:**
```
http://localhost:3000
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
```

### Supabase
**Site URL:**
```
http://localhost:3000
```

**Redirect URLs:**
```
http://localhost:3000/*
```

---

## The Best Workflow

1. **Desktop development**: Use `localhost:3000` (no setup needed)
2. **Mobile testing**: Use `ngrok` or `localhost.run` tunnel
3. **Production**: Use your real domain

### When Testing on Mobile:
1. Start tunnel: `ngrok http 3000`
2. Update `.env.local` with tunnel URL
3. Update Google OAuth with tunnel URL
4. Update Supabase with tunnel URL
5. Test on phone

### When Back to Desktop:
1. Stop tunnel
2. Revert `.env.local` to `localhost:3000`
3. Keep both URLs in Google OAuth (localhost + tunnel)
4. Develop normally

---

## Why This Happens

Google OAuth security rules:
- ✅ Allows: `http://localhost:*` (special case)
- ✅ Allows: `https://*.ngrok.io`, `https://*.lhr.life` (public domains)
- ❌ Blocks: `http://192.168.0.100:*` (private IP addresses)

**Reason**: Prevents OAuth token theft on public/shared networks.

---

## Your Original Issue: Double Login

The double-login was **NOT** because of localhost vs IP.

It was likely due to:
1. Cookie domain mismatch
2. Session not persisting correctly
3. Middleware redirecting unnecessarily

With `localhost` it should work fine. The double-login might have been a temporary issue with:
- Cached sessions
- Cookie conflicts
- Browser state

**Try now with localhost:**
1. Clear all cookies/cache
2. Remove Google OAuth permission
3. Test fresh login with `localhost:3000`

If double-login still happens, we'll debug the session/middleware logic.
