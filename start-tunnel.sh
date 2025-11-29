#!/bin/bash
# Cloudflare Tunnel for QuotePro
# Free alternative to ngrok with no bandwidth limits

echo "🚀 Starting Cloudflare Tunnel..."
echo ""
echo "This will create a public URL for:"
echo "  - Next.js (port 3000)"
echo "  - Python Backend (port 8000)"
echo ""

# Start tunnel for Next.js frontend
cloudflared tunnel --url http://localhost:3000
