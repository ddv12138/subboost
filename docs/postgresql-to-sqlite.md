# PostgreSQL to SQLite migration

This procedure is for an existing self-hosted installation. New installations can start directly with SQLite. Keep the PostgreSQL data directory and a verified logical dump until the SQLite deployment has been stable.

The application and cron containers run as UID:GID `1000:1000`. Create the SQLite host directory with that ownership before starting them. The legacy PostgreSQL container keeps its existing PostgreSQL-owned data directory while it is needed for rollback; changing that directory to UID 1000 would prevent the stock PostgreSQL image from reliably reopening it.

## Prepare

1. Record the current Compose file, `.env`, running app image ID, and PostgreSQL data directory. Tag the currently running app image `local-app:pre-sqlite` for rollback. The repository's `local/docker-compose.postgres-legacy.yml` preserves the bind mount `./postgres-data:/var/lib/postgresql/data`. Do not remove the database container or data directory.
2. From the installation directory, create and verify a logical backup:

   ```sh
   stamp="$(date -u +%Y%m%dT%H%M%SZ)"
   umask 077
   docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "backups/subboost-pre-sqlite-$stamp.sql"
   test -s "backups/subboost-pre-sqlite-$stamp.sql"
   ```

   Obtain `POSTGRES_USER` and `POSTGRES_DB` from the existing `.env` without publishing their values. Verify the dump with `pg_restore --list` when using a custom-format dump, or inspect its SQL header and table sections when using the command above.
3. Build the SQLite-capable image while PostgreSQL is still running. Confirm the production host has the required space and that the image was built for its architecture.
4. Create the data directory and assign it to the requested host account:

   ```sh
   install -d -o 1000 -g 1000 -m 0750 data
   ```

## Cut over

1. Stop app and cron writes while leaving PostgreSQL running:

   ```sh
   docker compose stop app cron
   ```

2. Preserve the original Compose file and `.env` with mode `0600`. Set `DATABASE_URL=file:/data/subboost.db`, `DATABASE_PATH=/data/subboost.db`, and temporarily set `LEGACY_DATABASE_URL` to the previous PostgreSQL URL. Keep `ENCRYPTION_KEY`, `JWT_SECRET`, `CRON_SECRET`, `APP_URL`, and port settings unchanged.
3. Apply the SQLite migration and import the PostgreSQL snapshot into the new empty SQLite database:

   ```sh
   docker compose run --rm --no-deps app sh -c 'node scripts/migrate-sqlite.mjs && npm run db:import-postgres'
   ```

   The importer uses a read-only repeatable-read PostgreSQL transaction, inserts all three business tables in one SQLite transaction, checks foreign keys and record counts, and prints counts only. It refuses to overwrite a target that already contains business rows.
4. Remove `LEGACY_DATABASE_URL` from `.env`, then start app and cron without orphan cleanup so the old PostgreSQL container remains available:

   ```sh
   docker compose up -d app cron
   ```

5. Check the app readiness endpoint, administrator login, subscription rendering, token URL, and automatic refresh. Confirm the SQLite file and any backup files are owned by UID:GID `1000:1000`.
6. After the agreed observation period, stop and remove only the PostgreSQL container. Keep `local/postgres-data`, the pre-migration dump, old Compose file, old `.env`, and old app image until a later cleanup decision.

## Roll back

If any import or application check fails, keep PostgreSQL data intact. Stop the SQLite app and cron, restore the saved `.env` with its PostgreSQL `DATABASE_URL`, restore the old app image tag if the rebuild replaced it, then start the legacy stack with `docker compose -f docker-compose.postgres-legacy.yml up -d`. The SQLite file can be retained for diagnosis and is not required to restore service.

Do not use `docker compose up --remove-orphans` during the observation period; it removes the legacy PostgreSQL container.
