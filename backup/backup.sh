#!/bin/sh
set -eu
umask 077 # new files readable by the owner only: dumps contain

DB_HOST="${DB_HOST:-db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL="${BACKUP_INTERVAL:-86400}"
BACKUP_KEEP="${BACKUP_KEEP:-7}"

PGPASSWORD="$(cat "${PGPASSWORD_FILE:-/run/secrets/postgres_backend_user_pw}")"
export PGPASSWORD

backup() {
	file="${BACKUP_DIR}/auto_$(date -u +%Y%m%d_%H%M%S).dump"
	if ! pg_dump -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$file.tmp"; then
		rm -f "$file.tmp"
		echo "backup FAILED: pg_dump error" >&2
		return 1
	fi

	if ! pg_restore --list "$file.tmp" | grep -q "TABLE DATA"; then
		rm -f "$file.tmp"
		echo "backup FAILED: the dump contains no table data" >&2
		return 1
	fi
	mv "$file.tmp" "$file"
	echo "backup ok: $file"
}

echo "backup: every ${BACKUP_INTERVAL}s, keeping ${BACKUP_KEEP} days of automatic dumps"

while true; do
	recent="$(find "$BACKUP_DIR" -name 'auto_*.dump' -mmin -"$((BACKUP_INTERVAL / 60))" 2>/dev/null | head -n 1)"
	if [ -n "$recent" ]; then
		echo "backup: skipped, recent automatic dump: $recent"
	elif backup; then
		find "$BACKUP_DIR" -name 'auto_*.dump' -mtime +"$BACKUP_KEEP" -delete
	fi

	sleep "$BACKUP_INTERVAL" &
	wait $!
done