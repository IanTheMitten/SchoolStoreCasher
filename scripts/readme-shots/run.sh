#!/usr/bin/env bash
# Regenerate docs/screenshots/*.png from invented demo data. See README.md in this folder.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$ROOT/docs/screenshots"
WORK="$(mktemp -d)"
export DEMO_DATA_DIR="$WORK/demo-data"
mkdir -p "$DEMO_DATA_DIR" "$WORK/raw" "$OUT"

if [ ! -d "$HERE/node_modules/playwright" ]; then
  echo "Installing Playwright (one time, uses your installed Chrome)..."
  npm install --prefix "$HERE" --no-audit --no-fund >/dev/null
fi

node "$HERE/gen-seed.mjs" "$DEMO_DATA_DIR/db.json"

echo "Starting demo server on http://localhost:3100 ..."
(cd "$ROOT" && npx vite --config "$HERE/vite.demo.config.ts" >"$WORK/vite.log" 2>&1) &
SERVER_PID=$!
cleanup() {
  pkill -P "$SERVER_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

for _ in $(seq 1 60); do
  curl -sf http://localhost:3100/ >/dev/null && break
  sleep 0.5
done
curl -sf http://localhost:3100/ >/dev/null || { echo "Demo server did not start:"; cat "$WORK/vite.log"; exit 1; }

node "$HERE/capture.mjs" "$WORK/raw" http://localhost:3100/

# Full-page shots are 2880px wide (2x); shrink to 1800px to keep the repo light.
for f in "$WORK/raw"/*.png; do
  name="$(basename "$f")"
  width=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
  if [ "$width" -gt 1800 ]; then
    sips -Z 1800 "$f" --out "$OUT/$name" >/dev/null
  else
    cp "$f" "$OUT/$name"
  fi
done

echo "Wrote $(ls "$WORK/raw" | wc -l | tr -d ' ') screenshots to docs/screenshots/"
