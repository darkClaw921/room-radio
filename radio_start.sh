#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

PORT="${PORT:-3000}"

echo "Starting Room Radio on http://localhost:$PORT"

cd "$SCRIPT_DIR"
source .venv/bin/activate

# Бэкенд на внутреннем порту 8074
uvicorn src.backend.main:app --host 0.0.0.0 --port 8074 --reload &
BACKEND_PID=$!

# Фронтенд на PORT
cd src/frontend
npm install --silent 
npx vite --port "$PORT" &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
