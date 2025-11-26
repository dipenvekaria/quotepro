#!/bin/bash
# Start the Python backend server

cd "$(dirname "$0")"
source venv/bin/activate
uvicorn main:app --reload --port 8000
