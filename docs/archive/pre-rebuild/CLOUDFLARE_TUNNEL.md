# Cloudflare Tunnel Setup (Free ngrok Alternative)

Cloudflare Tunnel is a **free alternative to ngrok** with:
- ✅ **No bandwidth limits**
- ✅ **No account required** for quick URLs
- ✅ **Stable URLs** (optional with account)
- ✅ **Better performance**
- ✅ **No request limits**

## Quick Start (No Account Needed)

### 1. Start Next.js Frontend Tunnel

```bash
./start-tunnel.sh
```

This will output something like:
```
Your quick Tunnel has been created!
Visit https://random-name-1234.trycloudflare.com
```

Copy that URL and use it to access your app from anywhere.

### 2. Start Python Backend Tunnel (Separate Terminal)

```bash
cd python-backend
./start-tunnel.sh
```

This will output:
```
Your quick Tunnel has been created!
Visit https://random-name-5678.trycloudflare.com
```

Copy this URL and update your Next.js environment variable:

```bash
# In your main terminal
export NEXT_PUBLIC_PYTHON_BACKEND_URL=https://random-name-5678.trycloudflare.com
```

Then restart Next.js:
```bash
npm run dev
```

## Usage

1. **Terminal 1**: Start Next.js
   ```bash
   npm run dev
   ```

2. **Terminal 2**: Start Python Backend
   ```bash
   cd python-backend
   ./start-server.sh
   ```

3. **Terminal 3**: Start Frontend Tunnel
   ```bash
   ./start-tunnel.sh
   ```

4. **Terminal 4**: Start Backend Tunnel
   ```bash
   cd python-backend
   ./start-tunnel.sh
   ```

5. **Update Backend URL** (if needed):
   - Copy the backend tunnel URL from Terminal 4
   - Set `NEXT_PUBLIC_PYTHON_BACKEND_URL` in `.env.local`
   - Or export it: `export NEXT_PUBLIC_PYTHON_BACKEND_URL=https://your-backend-url.trycloudflare.com`
   - Restart Next.js

6. **Share Frontend URL**:
   - Copy the frontend URL from Terminal 3
   - Share with anyone to test

## Advanced: Stable URLs (Optional, Free)

If you want the **same URL every time** instead of random URLs:

### 1. Login to Cloudflare
```bash
cloudflared tunnel login
```

### 2. Create a Named Tunnel
```bash
cloudflared tunnel create quotepro
```

### 3. Update start-tunnel.sh
```bash
#!/bin/bash
cloudflared tunnel run quotepro --url http://localhost:3000
```

### 4. Configure DNS
Follow the prompts to set up a subdomain like `quotepro.yourdomain.com`

## Comparison: Cloudflare vs ngrok

| Feature | Cloudflare Tunnel | ngrok Free |
|---------|------------------|------------|
| Bandwidth | ✅ Unlimited | ❌ Limited |
| Speed | ✅ Fast | ⚠️ Can be slow |
| Account Required | ❌ No (for quick) | ✅ Yes |
| Stable URLs | ✅ Free with account | ❌ Paid only |
| Request Limits | ✅ None | ❌ 40/min |

## Troubleshooting

### Tunnel Closes Immediately
Make sure your app is running first:
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Then start tunnel
./start-tunnel.sh
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### URL Changes Every Time
- This is normal for quick tunnels (no account)
- To get stable URLs, follow "Advanced: Stable URLs" section above

## Notes

- Each tunnel URL is **valid for 24 hours** (quick mode)
- With a Cloudflare account, tunnels are **permanent**
- You can run **multiple tunnels** simultaneously
- Perfect for **mobile testing** and **client demos**
