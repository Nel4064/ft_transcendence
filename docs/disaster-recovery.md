# Backups and disaster recovery

## What is backed up, and where

| What | How | Where |
|---|---|---|
| The whole PostgreSQL database (accounts, friends, screenings, RSVPs, notifications…) | The `backup` container runs `pg_dump` once at start, then every `BACKUP_INTERVAL` seconds (default: once a day) | `./backups/<db>_<date>_<time>.dump` on the host |
| A manual backup, on demand | `make backup` | `./backups/manual_<date>_<time>.dump` |

- Only the `BACKUP_KEEP` most recent automatic dumps are kept (default: 7). Manual dumps are never deleted automatically.
- `./backups` is a folder of the host, **not** a podman volume, so `make clean` (which deletes the volumes) does not delete the backups.
- `./backups` is in `.gitignore`: a dump contains personal data (emails, password hashes) and must never be committed.
- Dumps use the PostgreSQL custom format (`pg_dump -Fc`): compressed, and restored with `pg_restore`.

Check that backups are running:

```bash
podman logs development-backup   # one "backup ok: …" line per backup
ls -lh backups/
```

For a demo, set `BACKUP_INTERVAL=60` in `.env.dev` and run `make up`: one backup per minute.

## Restore a backup

```bash
make restore FILE=backups/<name>.dump
```

This stops the backend, replaces the content of the database with the dump (in a single transaction: if anything fails, the data is left unchanged), then starts the backend and restarts the proxy.

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
2. Recreate `.env.dev` (from `.env.dev.example`) and the files in `./secrets/`. The two 42 OAuth secrets come from the 42 intra.
3. `make` and wait until `make containers` shows every container `healthy`.
4. Copy a backup file into `./backups/`.
5. `make restore FILE=backups/<name>.dump`.

## Test the procedure (done before merging, and to show during the evaluation)

1. As an admin, add a recognisable screening (Select Movies).
2. `make backup`: a `backups/manual_….dump` file appears and is not empty.
3. `make clean && make`: the database volume is destroyed and recreated (seed data only).
4. Open Screenings: the screening is gone.
5. `make restore FILE=backups/manual_….dump`.
6. Open Screenings: the screening is back.

## Known limits

- **Same disk.** The backups are stored on the same machine as the database. They protect against mistakes (`make clean`, a wrong deletion, an incompatible schema change), not against the loss of the disk. Copy a dump somewhere else regularly (another machine, a USB key). A production setup would send them to another server automatically.
- **Uploaded files are not in the dump.** Avatars uploaded by users are files in `backend/uploads/`, not rows in the database. To keep them, copy this folder together with the dump.
- **Schema changes.** A dump has the structure of the database at the time it was taken. Restoring an old dump with newer code is fine when the code only *adds* columns or tables (`prisma db push` adds them at the next start). If the newer code *removed* something that the dump contains, `prisma db push` refuses to start the backend (data loss): use a more recent dump, or `make clean && make`.