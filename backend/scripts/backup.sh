#!/usr/bin/env bash
#
# Off-platform Postgres backup (Railway keeps its own snapshots; this is the
# copy that survives losing the Railway account).
#
# Usage:
#   DATABASE_URL=postgresql://... ./scripts/backup.sh          # explicit URL
#   ./scripts/backup.sh                                        # falls back to backend/.env
#
# For production, grab the URL from Railway:
#   railway variables --service <service> | grep DATABASE_URL
#
# Suggested cron (daily at 03:15, from the backend/ directory):
#   15 3 * * * cd /path/to/coco-counseling/backend && DATABASE_URL=... ./scripts/backup.sh >> ~/coco-backups/backup.log 2>&1
#
set -euo pipefail

BACKUP_DIR="${COCO_BACKUP_DIR:-$HOME/coco-backups}"
KEEP=14

# Fall back to backend/.env if DATABASE_URL isn't set
if [ -z "${DATABASE_URL:-}" ] && [ -f "$(dirname "$0")/../.env" ]; then
  DATABASE_URL=$(grep -E '^DATABASE_URL=' "$(dirname "$0")/../.env" | head -1 | cut -d= -f2- | tr -d '"')
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set and backend/.env has none" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/coco_${STAMP}.dump"

pg_dump --format=custom --no-owner --no-privileges --file="$OUT" "$DATABASE_URL"
echo "Backed up to $OUT ($(du -h "$OUT" | cut -f1))"

# Keep only the newest $KEEP dumps
ls -t "$BACKUP_DIR"/coco_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old"; done
echo "Retention: keeping newest $KEEP dumps in $BACKUP_DIR"

# Restore with:
#   pg_restore --clean --no-owner -d "$DATABASE_URL" <file>.dump
