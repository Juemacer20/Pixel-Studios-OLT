#!/usr/bin/env bash
# Sincronización periódica desde SmartOLT: crawl + import a la DB.
# Uso: ./sync-smartolt.sh   (pensado para cron). Lock para evitar solapamientos.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$BACKEND_DIR/logs"
LOG="$LOG_DIR/sync-smartolt.log"
LOCK="/tmp/olt-sync-smartolt.lock"
NODE_BIN="$(command -v node || echo /usr/bin/node)"

mkdir -p "$LOG_DIR"

# Evitar ejecuciones solapadas
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date '+%F %T')] Ya hay una sync corriendo, salgo." >> "$LOG"
  exit 0
fi

echo "==================================================================" >> "$LOG"
echo "[$(date '+%F %T')] Inicio sync SmartOLT" >> "$LOG"

cd "$BACKEND_DIR"

# 1) Crawl
if "$NODE_BIN" scripts/crawl-smartolt.js >> "$LOG" 2>&1; then
  echo "[$(date '+%F %T')] Crawl OK" >> "$LOG"
else
  echo "[$(date '+%F %T')] ERROR en crawl — abortando (se conserva el dato anterior)" >> "$LOG"
  exit 1
fi

# 2) Import
if "$NODE_BIN" scripts/import-smartolt.js >> "$LOG" 2>&1; then
  echo "[$(date '+%F %T')] Import OK" >> "$LOG"
else
  echo "[$(date '+%F %T')] ERROR en import" >> "$LOG"
  exit 1
fi

echo "[$(date '+%F %T')] Sync completa" >> "$LOG"
