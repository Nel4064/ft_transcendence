#!/bin/bash
# Runs once, on the first start with an empty postgres_data volume (official image: /docker-entrypoint-initdb.d/).
# Creates the least-privileged role the backend connects with; the superuser stays inside this container.

set -e     # any error will cause the script to exit immediately

BACKEND_PASSWORD=$(cat "$POSTGRES_BACKEND_PW_FILE")

# psql runs as the superuser ($POSTGRES_USER) on $POSTGRES_DB; ON_ERROR_STOP=1 aborts on the first SQL error
# 1. create the backend role and let it use the application database
# 2. in the public schema: allow it to create objects (needed by `prisma db push`)
#    and to use every existing table, sequence and function
# 3. default privileges: the same rights apply to objects created later
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER "${POSTGRES_BACKEND_USER}" WITH PASSWORD '${BACKEND_PASSWORD}';
    GRANT ALL PRIVILEGES ON DATABASE "${POSTGRES_DB}" TO "${POSTGRES_BACKEND_USER}";

    GRANT USAGE, CREATE ON SCHEMA public TO "${POSTGRES_BACKEND_USER}";
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${POSTGRES_BACKEND_USER}";
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${POSTGRES_BACKEND_USER}";
    GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "${POSTGRES_BACKEND_USER}";

    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${POSTGRES_BACKEND_USER}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${POSTGRES_BACKEND_USER}";
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${POSTGRES_BACKEND_USER}";
EOSQL
