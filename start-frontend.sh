#!/bin/bash
# Start the Rivet frontend (Next.js) on :3000.
# Run from the repo root: ./start-frontend.sh
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env.local ] || { echo "Missing .env.local — copy .env.example first."; exit 1; }
[ -d node_modules ] || npm install

echo "Frontend → http://localhost:3000"
exec npm run dev
