#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
RAW_FILE="$BACKUP_DIR/legalestate_${TIMESTAMP}.sql"
ENC_FILE="$RAW_FILE.enc"

echo "Creating database backup..."
pg_dump "$DATABASE_URL" > "$RAW_FILE"

if [[ -n "$BACKUP_PASSPHRASE" ]]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"$BACKUP_PASSPHRASE" -in "$RAW_FILE" -out "$ENC_FILE"
  rm -f "$RAW_FILE"
  echo "Encrypted backup written to $ENC_FILE"
else
  echo "WARNING: BACKUP_PASSPHRASE not set; backup stored unencrypted at $RAW_FILE" >&2
fi

find "$BACKUP_DIR" -name 'legalestate_*.sql*' -mtime +14 -delete
echo "Backup complete"
