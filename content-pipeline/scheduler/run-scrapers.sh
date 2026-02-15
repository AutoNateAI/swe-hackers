#!/usr/bin/env bash
# Runs all 3 scrapers in parallel and waits for all to finish
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"

echo "[$(date -Iseconds)] Starting scrapers..."

# Run all 3 scrapers in parallel
node "$PIPELINE_DIR/scrapers/reddit-scraper.mjs" &
PID_REDDIT=$!

node "$PIPELINE_DIR/scrapers/youtube-scraper.mjs" &
PID_YOUTUBE=$!

node "$PIPELINE_DIR/scrapers/linkedin-scraper.mjs" &
PID_LINKEDIN=$!

# Wait for all, track failures
FAILED=0

wait $PID_REDDIT || { echo "[$(date -Iseconds)] Reddit scraper failed"; FAILED=$((FAILED+1)); }
wait $PID_YOUTUBE || { echo "[$(date -Iseconds)] YouTube scraper failed"; FAILED=$((FAILED+1)); }
wait $PID_LINKEDIN || { echo "[$(date -Iseconds)] LinkedIn scraper failed"; FAILED=$((FAILED+1)); }

echo "[$(date -Iseconds)] Scrapers complete. Failures: $FAILED/3"

# Continue even if some scrapers fail (we still want to process whatever we got)
exit 0
