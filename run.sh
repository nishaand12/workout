#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "Starting wourkout on http://${HOST}:${PORT}..."
echo "Accessible over Tailnet at: http://100.80.166.28:${PORT}"

exec python3 -m uvicorn app.main:app --host "$HOST" --port "$PORT"
