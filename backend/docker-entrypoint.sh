#!/bin/sh
set -e

BACKEND_PW=$(cat /run/secrets/postgres_backend_user_pw)
DATABASE_URL="postgresql://${POSTGRES_BACKEND_USER}:${BACKEND_PW}@db:5432/${POSTGRES_DB}?schema=public"

export DATABASE_URL
export JWT_SECRET=$(cat /run/secrets/jwt_secret)
# --- 42 OAuth (enable with auth module) ---
export FORTYTWO_CLIENT_ID=$(cat /run/secrets/fortytwo_client_id)
export FORTYTWO_CLIENT_SECRET=$(cat /run/secrets/fortytwo_client_secret)

# 1. 先生成 Prisma 客户端（必须在最前面，保证依赖完整）
npx prisma generate

# 2. apply schema.prisma changes to the database
npx prisma db push

# 3. 最后再跑 seed
echo "Seeding bot users and games..."
if [ "$NODE_ENV" = "production" ]; then
    node ./dist/prisma/seed.js
else
    npx prisma db seed
fi

exec "$@"