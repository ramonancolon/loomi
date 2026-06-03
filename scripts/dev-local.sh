#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="${NODE:-/usr/share/cursor/resources/app/resources/helpers/node}"
TEMPORAL_BIN="$ROOT/.tools/temporal"
TEMPORAL_DB="$ROOT/.tools/temporal-data/loomi.db"

if [[ ! -x "$TEMPORAL_BIN" ]]; then
  echo "Temporal CLI not found at $TEMPORAL_BIN"
  echo "Download it with:"
  echo "  mkdir -p $ROOT/.tools && cd $ROOT/.tools"
  echo "  curl -fsSL 'https://temporal.download/cli/archive/latest?platform=linux&arch=amd64' -o temporal-cli.tar.gz"
  echo "  tar -xzf temporal-cli.tar.gz temporal && rm temporal-cli.tar.gz && chmod +x temporal"
  exit 1
fi

mkdir -p "$ROOT/.tools/temporal-data"

echo "Starting Temporal dev server on :7233 (UI: http://localhost:8233)..."
"$TEMPORAL_BIN" server start-dev \
  --db-filename "$TEMPORAL_DB" \
  --ui-port 8233 &
TEMPORAL_PID=$!

cleanup() {
  kill "$TEMPORAL_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for Temporal..."
for _ in $(seq 1 30); do
  if curl -sf http://127.0.0.1:7233 >/dev/null 2>&1 || nc -z 127.0.0.1 7233 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "Building backend..."
(cd "$ROOT/backend" && "$NODE" node_modules/.bin/tsc)

echo "Starting backend API on :3001..."
(cd "$ROOT/backend" && "$NODE" dist/index.js) &
BACKEND_PID=$!

echo "Starting Temporal worker..."
(cd "$ROOT/backend" && "$NODE" dist/worker.js) &
WORKER_PID=$!

echo
echo "Loomi stack is up:"
echo "  Backend:  http://localhost:3001/health"
echo "  Frontend: http://localhost:3000 (start separately with: cd frontend && npm run dev)"
echo "  Temporal UI: http://localhost:8233"
echo
echo "Press Ctrl+C to stop Temporal (backend/worker keep running in background from this script)."

wait "$BACKEND_PID" "$WORKER_PID"
