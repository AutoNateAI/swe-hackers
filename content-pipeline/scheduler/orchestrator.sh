#!/usr/bin/env bash
# Main pipeline orchestrator: scrape → ingest → generate → publish
# Called by cron: 0 7,13,19 * * *
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"

# Source environment (gets OPENAI_API_KEY and other env vars)
if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc" 2>/dev/null || true
fi

# Also load .env if it exists
if [ -f "$PIPELINE_DIR/.env" ]; then
  set -a
  source "$PIPELINE_DIR/.env"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"

echo "============================================"
echo "[$(date -Iseconds)] Pipeline run starting"
echo "============================================"

# Step 1: Scrape
echo ""
echo "[$(date -Iseconds)] Step 1/4: Running Apify scraper..."
node "$PIPELINE_DIR/scrapers/apify-scraper.mjs"

# Step 2: Ingest
echo ""
echo "[$(date -Iseconds)] Step 2/4: Ingesting scraped data to Firestore..."
node "$PIPELINE_DIR/ingest/firestore-writer.mjs"

# Step 3: Generate
echo ""
echo "[$(date -Iseconds)] Step 3/4: Generating content..."
node "$PIPELINE_DIR/generators/content-generator.mjs"

# Step 4: Publish
echo ""
echo "[$(date -Iseconds)] Step 4/4: Publishing to feed..."
node "$PIPELINE_DIR/publisher/feed-publisher.mjs"

echo ""
echo "============================================"
echo "[$(date -Iseconds)] Pipeline run complete"
echo "============================================"
