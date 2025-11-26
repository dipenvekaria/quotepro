# Setup Local Domain for Google OAuth

## The Problem
Google OAuth **does not allow raw IP addresses** in redirect URIs. You must use a domain ending in a public TLD like `.com`, `.dev`, `.local`, etc.

## Solution: Use a Local Domain

### Step 1: Edit Your Hosts File

**On macOS/Linux:**
```bash
sudo nano /etc/hosts
```

**Add this line:**
```
192.168.0.100  quotepro.local
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter`

**Flush DNS cache:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### Step 2: Update Environment Variables

Update `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://quotepro.local:3000
NEXT_PUBLIC_SITE_URL=http://quotepro.local:3000
```

### Step 3: Restart Your Dev Server

```bash
# Stop current server (Ctrl + C)
npm run dev
```

### Step 4: Update Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

**Authorized JavaScript origins:**
```
http://quotepro.local:3000
```

**Authorized redirect URIs:**
```
https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
http://quotepro.local:3000/auth/callback
```

### Step 5: Update Supabase Dashboard

Go to: https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration

**Site URL:**
```
http://quotepro.local:3000
```

**Redirect URLs:**
```
http://quotepro.local:3000/*
```

### Step 6: Update Mobile Device Hosts (For Testing on Phone)

Since you want to test on mobile, you need to access the domain from your phone too.

**On iPhone/iPad:**
Unfortunately, iOS doesn't allow easy hosts file editing without jailbreak.

**Best approach for mobile testing:**
1. Use the domain `quotepro.local` on your Mac
2. Access from phone using: `http://quotepro.local:3000`
3. This works because both devices are on the same network and your Mac's hostname resolves

**If that doesn't work, use Option 2 below.**

---

## Alternative Option 2: Use ngrok or LocalTunnel

### Using ngrok (Free Tier Available)

1. **Install ngrok:**
```bash
brew install ngrok
```

2. **Start ngrok:**
```bash
ngrok http 3000
```

3. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)

4. **Update environment variables:**
```env
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io
```

5. **Update Google OAuth:**
- Authorized JavaScript origins: `https://abc123.ngrok.io`
- Authorized redirect URIs: `https://abc123.ngrok.io/auth/callback`

6. **Update Supabase:**
- Site URL: `https://abc123.ngrok.io`
- Redirect URLs: `https://abc123.ngrok.io/*`

**Pros:**
- ✅ Works with Google OAuth (has .io TLD)
- ✅ Works from any device (phone, tablet, etc.)
- ✅ HTTPS by default

**Cons:**
- ❌ URL changes every time you restart ngrok (unless paid plan)
- ❌ Requires internet connection
- ❌ Slower than local network

---

## Alternative Option 3: Use .local with mDNS/Bonjour

### Setup .local domain (works on same network)

1. **On your Mac, find your computer name:**
```bash
scutil --get ComputerName
```

2. **Your Mac is automatically available as:**
```
http://YourComputerName.local:3000
```

For example, if your Mac is named "Dipen-MacBook":
```
http://Dipen-MacBook.local:3000
```

3. **Update Google OAuth to use:**
```
http://YourComputerName.local:3000
http://YourComputerName.local:3000/auth/callback
```

**Note:** `.local` domains work via mDNS/Bonjour and should be accessible from your phone on the same WiFi network.

---

## Recommended Approach

**For development on Mac + iPhone testing:**

1. **Use `.local` domain with your Mac's hostname**
   - No hosts file editing needed
   - Works across devices on same network
   - Example: `http://dipens-macbook.local:3000`

2. **Update all configs to use this domain:**
   - Google Cloud Console
   - Supabase Dashboard
   - `.env.local`

3. **Test from both Mac and iPhone**
   - Should work on same WiFi network
   - If not, fall back to ngrok

---

## Testing Your Setup

1. **Verify domain resolves:**
```bash
ping quotepro.local
# Should show: 192.168.0.100
```

2. **Access from browser:**
```
http://quotepro.local:3000
```

3. **Test Google OAuth:**
- Click "Continue with Google"
- Should redirect properly without localhost issues

4. **Test from mobile device:**
- Connect phone to same WiFi
- Open: `http://quotepro.local:3000`
- Test Google login

---

## Why IP Addresses Don't Work

Google OAuth security requirements:
- ✅ Allows: `http://localhost:*` (special case for development)
- ✅ Allows: `http://example.com`, `https://app.example.dev`
- ❌ Blocks: `http://192.168.0.100:3000` (raw IP)
- ❌ Blocks: `http://example:3000` (no TLD)

This prevents OAuth tokens from being intercepted on open networks.
