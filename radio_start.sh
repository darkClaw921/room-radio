#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

PORT="${PORT:-8000}"

echo "Starting Room Radio on port $PORT..."

cd "$SCRIPT_DIR"
source .venv/bin/activate
uvicorn src.backend.main:app --host 0.0.0.0 --port "$PORT" --reload
