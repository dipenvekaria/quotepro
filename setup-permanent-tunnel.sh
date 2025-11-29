#!/bin/bash
# Setup Permanent Cloudflare Tunnel (Free)
# This will give you a stable URL that never changes

echo "🔐 Setting up Permanent Cloudflare Tunnel"
echo ""
echo "This will give you a permanent URL like:"
echo "  - quotepro-abc123.cfargotunnel.com (free subdomain)"
echo "  - Or use your own domain"
echo ""

# Step 1: Login to Cloudflare
echo "Step 1: Login to Cloudflare (opens browser)..."
cloudflared tunnel login

# Step 2: Create named tunnel
echo ""
echo "Step 2: Creating tunnel 'quotepro'..."
cloudflared tunnel create quotepro

# Step 3: Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep quotepro | awk '{print $1}')
echo ""
echo "✅ Tunnel created! ID: $TUNNEL_ID"

# Step 4: Create config file
echo ""
echo "Step 3: Creating config file..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: quotepro.trycloudflare.com
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "✅ Config created at ~/.cloudflared/config.yml"
echo ""
echo "Step 4: Setting up DNS..."
cloudflared tunnel route dns quotepro quotepro.trycloudflare.com

echo ""
echo "🎉 DONE! Your permanent URL is:"
echo ""
echo "  https://quotepro.trycloudflare.com"
echo ""
echo "This URL will NEVER change!"
echo ""
echo "To start the tunnel:"
echo "  cloudflared tunnel run quotepro"
echo ""
echo "Update your .env.local to use this permanent URL"
