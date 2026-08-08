#!/bin/bash
# Start the Rivet AI service (FastAPI + Gemini) on :8000.
# Run from the repo root: ./start-backend.sh
set -euo pipefail
cd "$(dirname "$0")/python-backend"

if [ ! -d .venv ]; then
  echo "Creating .venv and installing dependencies…"
  python3 -m venv .venv
  .venv/bin/pip install --quiet --upgrade pip
  .venv/bin/pip install --quiet -r requirements.txt
fi

[ -f .env ] || { echo "Missing python-backend/.env — copy .env.example first."; exit 1; }

echo "AI service → http://localhost:8000  (health: /health)"
exec .venv/bin/uvicorn ai_backend:app --reload --port 8000
