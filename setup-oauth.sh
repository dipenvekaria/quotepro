#!/bin/bash

# Quick OAuth Testing Script

echo "🔧 QuotePro OAuth Setup Helper"
echo "================================"
echo ""
echo "Choose your testing scenario:"
echo ""
echo "1. Desktop Development (localhost:3000)"
echo "2. Mobile Testing (needs tunnel like ngrok)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "✅ Desktop Development Mode"
    echo "----------------------------"
    echo ""
    echo "Your .env.local is already set to:"
    echo "  NEXT_PUBLIC_APP_URL=http://localhost:3000"
    echo ""
    echo "Make sure Google OAuth has:"
    echo "  Origins: http://localhost:3000"
    echo "  Redirect: http://localhost:3000/auth/callback"
    echo ""
    echo "✨ You're all set! Run: npm run dev"
    echo ""
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "📱 Mobile Testing Mode"
    echo "----------------------"
    echo ""
    echo "You need a public URL for mobile testing."
    echo ""
    echo "Option A: localhost.run (Free, No signup)"
    echo "  Run: ssh -R 80:localhost:3000 nokey@localhost.run"
    echo ""
    echo "Option B: ngrok (Free, requires signup)"
    echo "  Install: brew install ngrok"
    echo "  Run: ngrok http 3000"
    echo ""
    echo "After starting tunnel:"
    echo "  1. Copy the HTTPS URL (e.g., https://abc.ngrok.io)"
    echo "  2. Update .env.local with that URL"
    echo "  3. Update Google OAuth with that URL"
    echo "  4. Update Supabase with that URL"
    echo "  5. Restart: npm run dev"
    echo ""
    echo "📖 Full guide: See MOBILE_TESTING.md"
    echo ""
else
    echo ""
    echo "❌ Invalid choice. Run script again."
    echo ""
fi
