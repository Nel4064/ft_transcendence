#!/bin/sh

BACKEND_PW=$(cat /run/secrets/postgres_backend_user_pw)
DATABASE_URL="postgresql://${POSTGRES_BACKEND_USER}:${BACKEND_PW}@db:5433/${POSTGRES_DB}?schema=public"

export DATABASE_URL
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
# --- 42 OAuth (enable with auth module) ---
export FORTYTWO_CLIENT_ID=$(cat /run/secrets/fortytwo_client_id)
export FORTYTWO_CLIENT_SECRET=$(cat /run/secrets/fortytwo_client_secret)

# apply schema.prisma changes to the database
npx prisma db push

echo "Seeding bot users and games..."
if [ "$NODE_ENV" = "production" ]; then
    node ./dist/prisma/seed.js
else
    npx prisma db seed
fi

exec "$@"
