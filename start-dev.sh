#!/bin/bash

# QuotePro Development Startup Script
# Starts frontend, backend, cloudflare tunnel, and updates Supabase URLs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/dipen/code/quotepro"
BACKEND_DIR="$PROJECT_DIR/python-backend"
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Supabase configuration - UPDATE THESE
SUPABASE_PROJECT_REF="your-project-ref"  # e.g., "abcdefghijklmnop"
SUPABASE_ACCESS_TOKEN=""  # Get from: https://supabase.com/dashboard/account/tokens

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   QuotePro Development Startup${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    # Kill all background processes
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Kill existing processes on ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
pkill -f cloudflared 2>/dev/null || true
sleep 2

# Start Python backend
echo -e "${GREEN}Starting Python backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
python -m uvicorn main:app --reload --port $BACKEND_PORT &
BACKEND_PID=$!
sleep 3

# Start Next.js frontend
echo -e "${GREEN}Starting Next.js frontend on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 5

# Start Cloudflare tunnel and capture URL
echo -e "${GREEN}Starting Cloudflare tunnel...${NC}"
TUNNEL_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:$FRONTEND_PORT 2>&1 | tee "$TUNNEL_LOG" &
TUNNEL_PID=$!

# Wait for tunnel URL to appear
echo -e "${YELLOW}Waiting for Cloudflare tunnel URL...${NC}"
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}Failed to get Cloudflare tunnel URL${NC}"
    echo -e "${YELLOW}Check tunnel log: $TUNNEL_LOG${NC}"
else
    echo -e "${GREEN}Tunnel URL: ${TUNNEL_URL}${NC}"
    
    # Update .env.local with tunnel URL
    ENV_FILE="$PROJECT_DIR/.env.local"
    if [ -f "$ENV_FILE" ]; then
        # Update or add NEXT_PUBLIC_SITE_URL
        if grep -q "NEXT_PUBLIC_SITE_URL=" "$ENV_FILE"; then
            sed -i '' "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=$TUNNEL_URL|" "$ENV_FILE"
        else
            echo "NEXT_PUBLIC_SITE_URL=$TUNNEL_URL" >> "$ENV_FILE"
        fi
        echo -e "${GREEN}Updated .env.local with tunnel URL${NC}"
    fi
    
    # Update Python backend CORS
    BACKEND_ENV="$BACKEND_DIR/.env"
    if [ -f "$BACKEND_ENV" ]; then
        ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,$TUNNEL_URL"
        if grep -q "ALLOWED_ORIGINS=" "$BACKEND_ENV"; then
            sed -i '' "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ALLOWED_ORIGINS|" "$BACKEND_ENV"
        else
            echo "ALLOWED_ORIGINS=$ALLOWED_ORIGINS" >> "$BACKEND_ENV"
        fi
        echo -e "${GREEN}Updated backend CORS origins${NC}"
    fi
    
    # Update Supabase Auth URLs via API
    if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ "$SUPABASE_PROJECT_REF" != "your-project-ref" ]; then
        echo -e "${YELLOW}Updating Supabase Auth URLs...${NC}"
        
        # Update site URL and redirect URLs
        REDIRECT_URLS="$TUNNEL_URL/**,http://localhost:3000/**"
        
        curl -s -X PATCH \
            "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
            -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
                \"site_url\": \"$TUNNEL_URL\",
                \"uri_allow_list\": \"$REDIRECT_URLS\"
            }" > /dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Supabase Auth URLs updated!${NC}"
            echo -e "  Site URL: $TUNNEL_URL"
            echo -e "  Redirect URLs: $REDIRECT_URLS"
        else
            echo -e "${RED}Failed to update Supabase URLs${NC}"
            echo -e "${YELLOW}Please update manually in Supabase Dashboard:${NC}"
            echo -e "  1. Go to Authentication > URL Configuration"
            echo -e "  2. Set Site URL: $TUNNEL_URL"
            echo -e "  3. Add Redirect URL: $TUNNEL_URL/**"
        fi
    else
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}MANUAL SUPABASE UPDATE REQUIRED${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo -e "1. Go to: https://supabase.com/dashboard/project/_/auth/url-configuration"
        echo -e "2. Set Site URL: ${GREEN}$TUNNEL_URL${NC}"
        echo -e "3. Add Redirect URL: ${GREEN}$TUNNEL_URL/**${NC}"
        echo -e "${YELLOW}========================================${NC}"
    fi
fi

# Print summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All services started!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Frontend:  http://localhost:$FRONTEND_PORT"
echo -e "Backend:   http://localhost:$BACKEND_PORT"
echo -e "Tunnel:    ${TUNNEL_URL:-'Starting...'}"
echo -e ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}========================================${NC}"

# Keep script running
wait
