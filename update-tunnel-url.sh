#!/bin/bash
# Helper script to update .env.local with current Cloudflare Tunnel URL

echo "🔧 Cloudflare Tunnel URL Updater"
echo ""
echo "This script will help you update your .env.local file with the new tunnel URL"
echo ""

# Get the current tunnel URL from the user
read -p "Enter your Cloudflare Tunnel URL (from tunnel terminal): " TUNNEL_URL

# Remove trailing slash if present
TUNNEL_URL=${TUNNEL_URL%/}

# Validate URL format
if [[ ! $TUNNEL_URL =~ ^https?:// ]]; then
    echo "❌ Invalid URL format. Must start with http:// or https://"
    exit 1
fi

echo ""
echo "📝 Updating .env.local..."

# Update .env.local file
sed -i.bak "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$TUNNEL_URL|g" .env.local
sed -i.bak "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=$TUNNEL_URL|g" .env.local

# Remove backup file
rm -f .env.local.bak

echo "✅ Updated .env.local with new URL: $TUNNEL_URL"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update Supabase Dashboard:"
echo "   - Go to: https://supabase.com/dashboard/project/ajljduisjyutbgjeucig/auth/url-configuration"
echo "   - Add Redirect URL: $TUNNEL_URL/**"
echo "   - Update Site URL: $TUNNEL_URL"
echo ""
echo "2. Restart Next.js server:"
echo "   - Press Ctrl+C in the Next.js terminal"
echo "   - Run: npm run dev"
echo ""
echo "3. Test Google Login:"
echo "   - Visit: $TUNNEL_URL"
echo "   - Click 'Login with Google'"
echo ""
