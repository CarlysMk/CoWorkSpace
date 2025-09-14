#!/usr/bin/env bash
set -euo pipefail

# Usage: ./backup.sh /path/to/backup.sql
OUT="${1:-backup_$(date +%Y%m%d_%H%M%S).sql}"
: "${DATABASE_URL:=postgres://cowork:coworkpass@db:5432/coworkdb}"
pg_dump "$DATABASE_URL" > "$OUT"
echo "Backup saved to $OUT"
