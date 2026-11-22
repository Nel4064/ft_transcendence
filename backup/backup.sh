#!/bin/sh
set -eu

PGPASSWORD="$(cat /run/secrets/postgres_backend_user_pw)"
export PGPASSWORD
: "${BACKUP_INTERVAL:=86400}"
: "${BACKUP_KEEP:=7}"

while true; do
	file="/backups/${POSTGRES_DB}_$(date +%Y%m%d_%H%M%S).dump"
	if pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$file.tmp"; then
		mv "$file.tmp" "$file"
		echo "backup ok: $file"
	else
		rm -f "$file.tmp"
		echo "backup FAILED" >&2
	fi
	ls -1t /backups/${POSTGRES_DB}_*.dump 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm --
	sleep "$BACKUP_INTERVAL"
done