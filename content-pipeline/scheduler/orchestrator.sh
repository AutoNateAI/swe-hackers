#!/usr/bin/env bash
# Main pipeline orchestrator: scrape → ingest → generate (text + carousel + comments) → publish
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

# Parse arguments for selective pipeline execution
RUN_SCRAPE=true
RUN_INGEST=true
RUN_GENERATE=true
RUN_CAROUSEL=true
RUN_COMMENTS=true
RUN_PUBLISH=true
POST_COUNT=""

for arg in "$@"; do
  case "$arg" in
    --ingest-only)    RUN_SCRAPE=false; RUN_GENERATE=false; RUN_CAROUSEL=false; RUN_COMMENTS=false; RUN_PUBLISH=false ;;
    --generate-only)  RUN_SCRAPE=false; RUN_INGEST=false; RUN_PUBLISH=false ;;
    --carousel-only)  RUN_SCRAPE=false; RUN_INGEST=false; RUN_GENERATE=false; RUN_COMMENTS=false; RUN_PUBLISH=false ;;
    --comments-only)  RUN_SCRAPE=false; RUN_INGEST=false; RUN_GENERATE=false; RUN_CAROUSEL=false; RUN_PUBLISH=false ;;
    --publish-only)   RUN_SCRAPE=false; RUN_INGEST=false; RUN_GENERATE=false; RUN_CAROUSEL=false; RUN_COMMENTS=false ;;
    --no-scrape)      RUN_SCRAPE=false ;;
    --no-publish)     RUN_PUBLISH=false ;;
    --count=*)        POST_COUNT="$arg" ;;
  esac
done

echo "============================================"
echo "[$(date -Iseconds)] Pipeline run starting"
echo "============================================"

# Step 1: Scrape (Reddit with comments, YouTube, LinkedIn)
if [ "$RUN_SCRAPE" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 1/6: Running scrapers..."
  node "$PIPELINE_DIR/scrapers/apify-scraper.mjs"
fi

# Step 2: Ingest to Firestore
if [ "$RUN_INGEST" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 2/6: Ingesting scraped data to Firestore..."
  node "$PIPELINE_DIR/ingest/firestore-writer.mjs"
fi

# Step 3: Generate text content (existing pipeline)
if [ "$RUN_GENERATE" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 3/6: Generating text content..."
  node "$PIPELINE_DIR/generators/content-generator.mjs"
fi

# Step 4: Generate image carousels
if [ "$RUN_CAROUSEL" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 4/6: Generating image carousels..."
  node "$PIPELINE_DIR/generators/carousel-generator.mjs" $POST_COUNT
fi

# Step 5: Generate comment threads for carousels
if [ "$RUN_COMMENTS" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 5/6: Generating comment threads..."
  node "$PIPELINE_DIR/generators/comment-generator.mjs"
fi

# Step 6: Publish to feed
if [ "$RUN_PUBLISH" = true ]; then
  echo ""
  echo "[$(date -Iseconds)] Step 6/6: Publishing to feed..."
  node "$PIPELINE_DIR/publisher/feed-publisher.mjs"
fi

echo ""
echo "============================================"
echo "[$(date -Iseconds)] Pipeline run complete"
echo "============================================"
