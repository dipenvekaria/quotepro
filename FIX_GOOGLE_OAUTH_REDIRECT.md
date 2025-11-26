# Fix Google OAuth Redirect to Use IP Instead of Localhost

## The Problem
Google OAuth is redirecting to `localhost:3000` instead of `192.168.0.100:3000` after authentication.

## Root Cause
The redirect URL is controlled by **Google Cloud Console** OAuth settings, not just Supabase.

## Complete Fix - 3 Steps Required

### Step 1: Update Google Cloud Console (CRITICAL)

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/credentials

2. **Find your OAuth 2.0 Client ID:**
   - Look for the client ID used by your Supabase project
   - Click on it to edit

3. **Update Authorized JavaScript origins:**
   Remove:
   ```
   http://localhost:3000
   ```
   
   Add:
   ```
   http://192.168.0.100:3000
   ```

4. **Update Authorized redirect URIs:**
   Remove:
   ```
   http://localhost:3000/auth/callback
   https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
   ```
   
   Keep/Add:
   ```
   https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
   http://192.168.0.100:3000/auth/callback
   ```

5. **Click Save**

### Step 2: Update Supabase Dashboard

1. **Go to Supabase Auth Settings:**
   https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration

2. **Set Site URL to:**
   ```
   http://192.168.0.100:3000
   ```

3. **Under Redirect URLs, add:**
   ```
   http://192.168.0.100:3000/*
   ```

4. **Remove or keep localhost URLs based on your preference:**
   - Keep `http://localhost:3000/*` if you want to develop on desktop
   - Remove it if you only want to use the IP address

5. **Click Save**

### Step 3: Clear All Cached Sessions

1. **Revoke Google OAuth permissions:**
   - Go to: https://myaccount.google.com/permissions
   - Find your Supabase/QuoteBuilder Pro app
   - Click **Remove access**

2. **Clear browser data:**
   ```
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data
   - Or: Settings → Privacy → Clear browsing data
   ```

3. **Clear cookies for both domains:**
   - `localhost:3000`
   - `192.168.0.100:3000`
   - `*.supabase.co`

### Step 4: Test

1. **Access app from IP:**
   ```
   http://192.168.0.100:3000
   ```

2. **Open browser console (F12)**

3. **Click "Continue with Google"**

4. **Check console log:**
   Should show: `OAuth redirect will be: http://192.168.0.100:3000/auth/callback`

5. **Complete Google login**

6. **Verify final URL:**
   Should be: `http://192.168.0.100:3000/dashboard`

## Alternative: Support Both localhost AND IP

If you want to use both URLs (for desktop and mobile):

### Google Cloud Console:
Add BOTH to Authorized JavaScript origins:
```
http://localhost:3000
http://192.168.0.100:3000
```

Add BOTH to Authorized redirect URIs:
```
http://localhost:3000/auth/callback
http://192.168.0.100:3000/auth/callback
https://ajljduisjyutbgjeucig.supabase.co/auth/v1/callback
```

### Supabase:
Set Site URL to whichever you use most:
```
http://192.168.0.100:3000
```

Add BOTH to Redirect URLs:
```
http://localhost:3000/*
http://192.168.0.100:3000/*
```

## Important Notes

1. **Google Cloud changes may take 5-10 minutes to propagate**
2. **Always clear Google permissions after making changes**
3. **The redirect URL is determined by Google, not your app code**
4. **Supabase acts as an intermediary but Google controls the final redirect**

## Troubleshooting

If still redirecting to localhost:

1. **Wait 10 minutes** after changing Google Cloud settings
2. **Use incognito/private browsing** to test
3. **Check Google Cloud Console** to verify changes saved
4. **Verify the Google Client ID** in Supabase matches the one you edited
5. **Check server logs** for the OAuth callback URL being received

## Finding Your Google OAuth App

If you don't know which Google OAuth app Supabase is using:

1. Go to Supabase Dashboard → Settings → Authentication
2. Scroll to "Google" provider settings
3. Copy the "Client ID" shown
4. Search for this Client ID in Google Cloud Console
