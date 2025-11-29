#!/bin/bash
# Cloudflare Tunnel for Python Backend
# Exposes port 8000 for AI quote generation

echo "🐍 Starting Cloudflare Tunnel for Python Backend..."
echo ""
echo "This will create a public URL for Python API (port 8000)"
echo ""

cloudflared tunnel --url http://localhost:8000
