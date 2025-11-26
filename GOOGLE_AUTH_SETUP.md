# Google OAuth Setup for Local Network Access

## What Changed
- Updated `NEXT_PUBLIC_APP_URL` from `http://localhost:3000` to `http://192.168.0.100:3000`
- Updated Google OAuth redirect to use the environment variable

## Important: Supabase Configuration Required

You need to add your local network URL to Supabase's allowed redirect URLs:

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `ajljduisjyutbgjeucig`

2. **Update Authentication Settings**
   - Go to: **Authentication** → **URL Configuration**
   - Find: **Redirect URLs** section

3. **Add Your Local Network URL**
   Add these URLs to the allowed list:
   ```
   http://192.168.0.100:3000/auth/callback
   http://localhost:3000/auth/callback
   ```

4. **Save Changes**

## Testing

After updating Supabase and restarting your dev server:

1. Access your app at: `http://192.168.0.100:3000`
2. Click "Continue with Google"
3. After Google authentication, you should be redirected back to `http://192.168.0.100:3000/auth/callback`
4. Then automatically redirected to dashboard

## Note

- The `localhost:3000` URL is kept as a backup for desktop development
- The `192.168.0.100:3000` URL allows mobile devices on the same network to access the app
- Both URLs need to be whitelisted in Supabase for OAuth to work

## Restart Dev Server

After changing `.env.local`, always restart:
```bash
# Stop current server (Ctrl+C or)
pkill -f "next dev"

# Start again
npm run dev -- --hostname 0.0.0.0
```

The `--hostname 0.0.0.0` flag allows access from other devices on your network.
