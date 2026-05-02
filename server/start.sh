#!/bin/sh

echo "=== TrustMatch Server Starting ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo YES || echo NO)"
echo "JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo YES || echo NO)"

echo ""
echo "Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -ne 0 ]; then
  echo "WARNING: Migration failed (exit $MIGRATE_EXIT) — attempting db push as fallback..."
  ./node_modules/.bin/prisma db push --accept-data-loss
fi

echo ""
echo "Starting Node server..."
exec node dist/index.js
