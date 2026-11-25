# Backups and disaster recovery

## What is backed up, and where

| What | How | Where |
|---|---|---|
| The whole PostgreSQL database (accounts, friends, screenings, RSVPs, notifications…) | The `backup` container runs `pg_dump` every `BACKUP_INTERVAL` seconds (default: once a day) | `./backups/auto_<date>_<time>.dump` on the host |
| A manual backup, on demand | `make backup` | `./backups/manual_<date>_<time>.dump` |

- **Names are in UTC** (both kinds), so sorting the files by name sorts them by date. Paris time is UTC+1 in winter, UTC+2 in summer.
- **The backup container waits for the backend to be `healthy`**, because the tables only exist once the backend has run `prisma db push`. Before that, a dump would be an empty database.
- **Every dump is checked**: it must contain table data (`TABLE DATA` entries). Otherwise the file is deleted and the log says `backup FAILED`, never `backup ok`.
- **Restarts don't create new dumps**: at start-up, if an automatic dump younger than `BACKUP_INTERVAL` already exists, the container waits instead of dumping again. So `make clean && make` several times a day does not fill the folder with seed-only dumps.
- **Retention by age**: automatic dumps older than `BACKUP_KEEP` days are deleted (default: 7), and only right after a successful new dump, so a recent one is always left. `manual_*.dump` files are never deleted automatically.
- **Owner-only permissions**: `./backups` is `drwx------` and the dumps are `-rw-------`, because they contain personal data (emails, password hashes).
- `./backups` is a folder of the host, **not** a podman volume, so `make clean` (which deletes the volumes) does not delete the backups.
- `./backups` is in `.gitignore`: a dump must never be committed.
- Dumps use the PostgreSQL custom format (`pg_dump -Fc`): compressed, and restored with `pg_restore`.

Check that backups are running and not empty:

```bash
podman logs development-backup   # one "backup ok: …" line per backup
ls -lh backups/
podman exec -i development-db pg_restore --list < backups/<name>.dump | grep -c "TABLE DATA"   # must be more than 0
```

For a demo, set `BACKUP_INTERVAL=60` in `.env.dev` and run `make up`: one backup per minute.

## Restore a backup

```bash
make restore FILE=backups/<name>.dump
```

The containers must be running (`make up` first): the command says so if they are not.

This stops the backend, replaces the content of the database with the dump (in a single transaction: if anything fails, the data is left unchanged), then starts the backend, waits until it is `healthy` (2 minutes at most) and restarts the proxy. It ends with `✅ Restored`, `❌ Restore failed, data unchanged`, or `⚠️ … the backend is not healthy` (then read `podman logs development-backend`).

The objects of the dump are given to the backend user of the current `.env.dev` (`--no-owner --role=…`), and the access rights saved in the dump are skipped (`--no-privileges`: the database already has its own, created by `database/init.sh`). So a dump can be restored even if `POSTGRES_SUPERUSER` or `POSTGRES_BACKEND_USER` have different names on the new machine.

## What to do when…

### A service is down

How you notice: `Exited` in `make containers`, or a 502 page.

1. `make containers` to see which container is not `healthy`.
2. `podman logs development-<name>` to read why it stopped.
3. `make restart` (backend, frontend and proxy).
4. If the backend stops again with a Prisma "data loss" message, the database no longer matches the schema: restore the most recent backup taken with the current code, or start from an empty database with `make clean && make`.

### Data was deleted or damaged

How you notice: screenings, friends or accounts are missing; someone deleted something by mistake.

1. `ls -lt backups/` and choose the most recent backup taken **before** the problem.
2. Optional, to keep the current state just in case: `make backup`.
3. `make restore FILE=backups/<name>.dump`.
4. Check in the app that the data is back.

### The whole machine is lost

1. On a new machine: `git clone` the repository.
2. Recreate `.env.dev` (from `.env.dev.example`) and the files in `./secrets/`. The two 42 OAuth secrets come from the 42 intra. The user names may be different from the old machine.
3. `make` and wait until `make containers` shows every container `healthy`.
4. Copy a backup file into `./backups/`.
5. `make restore FILE=backups/<name>.dump`.

## Test the procedure (done before merging, and to show during the evaluation)

1. As an admin, add a recognisable screening (Select Movies).
2. `make backup`: a `backups/manual_….dump` file appears (`💾 Backup saved`; the command checks that it contains table data).
3. `make clean && make`: the database volume is destroyed and recreated (seed data only).
4. Open Screenings: the screening is gone.
5. `make restore FILE=backups/manual_….dump`.
6. Open Screenings: the screening is back.

## Known limits

- **Same disk.** The backups are stored on the same machine as the database. They protect against mistakes (`make clean`, a wrong deletion, an incompatible schema change), not against the loss of the disk. Copy a dump somewhere else regularly (another machine, a USB key). A production setup would send them to another server automatically.
- **Uploaded files are not in the dump.** Avatars uploaded by users are files in `backend/uploads/`, not rows in the database. To keep them, copy this folder together with the dump.
- **Schema changes.** A dump has the structure of the database at the time it was taken. Restoring an old dump with newer code is fine when the code only *adds* columns or tables (`prisma db push` adds them at the next start). If the newer code *removed* something that the dump contains, `prisma db push` refuses to start the backend (data loss): use a more recent dump, or `make clean && make`.
- **Personal data (GDPR).** A dump keeps the data of a deleted account for as long as the dump is kept (`BACKUP_KEEP` days for automatic dumps, forever for manual ones until someone deletes them). Restoring an old dump brings deleted accounts back: after a restore, the deletions requested since that dump must be done again. Delete manual dumps you no longer need.