#!/usr/bin/env bash
# Installs the content pipeline cron job
# Schedule: 7am, 1pm, 7pm daily
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PIPELINE_DIR/logs"

mkdir -p "$LOG_DIR"

CRON_CMD="0 7,13,19 * * * $SCRIPT_DIR/orchestrator.sh >> $LOG_DIR/cron.log 2>&1"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -qF "orchestrator.sh"; then
  echo "Cron job already installed. Current entry:"
  crontab -l | grep "orchestrator.sh"
  echo ""
  echo "To reinstall, first remove the existing entry manually."
  exit 0
fi

# Add to existing crontab (preserve other entries)
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "Cron job installed successfully!"
echo "Schedule: 7:00 AM, 1:00 PM, 7:00 PM daily"
echo "Logs: $LOG_DIR/cron.log"
echo ""
echo "Verify with: crontab -l"
