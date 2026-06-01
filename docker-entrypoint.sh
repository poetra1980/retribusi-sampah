#!/bin/sh
set -e

PARSE_DB_URL() {
  URL="$1"
  if [ -z "$URL" ]; then
    return 1
  fi
  DB_HOST=$(echo "$URL" | sed -n 's|.*://[^:]*:\([^@]*\)@\([^:/]*\).*|\2|p')
  if [ -z "$DB_HOST" ]; then
    DB_HOST=$(echo "$URL" | sed -n 's|.*://[^:]*@\([^:/]*\).*|\1|p')
  fi
  DB_PORT=$(echo "$URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*:\([0-9]*\)/.*|\2|p')
  DB_USER=$(echo "$URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo "$URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  DB_NAME=$(echo "$URL" | sed -n 's|.*/\([^?]*\)|\1|p')
  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    return 0
  fi
  return 1
}

if [ -n "$DATABASE_URL" ]; then
  if PARSE_DB_URL "$DATABASE_URL"; then
    DATABASE_HOST="${DATABASE_HOST:-$DB_HOST}"
    DATABASE_PORT="${DATABASE_PORT:-$DB_PORT}"
    DATABASE_USER="${DATABASE_USER:-$DB_USER}"
    DATABASE_PASSWORD="${DATABASE_PASSWORD:-$DB_PASS}"
    DATABASE_NAME="${DATABASE_NAME:-$DB_NAME}"
  fi
fi

: "${DATABASE_HOST:=localhost}"
: "${DATABASE_PORT:=5432}"
: "${DATABASE_USER:=postgres}"
: "${DATABASE_PASSWORD:=postgres}"
: "${DATABASE_NAME:=retribusi_sampah}"

export DATABASE_HOST DATABASE_PORT DATABASE_USER DATABASE_PASSWORD DATABASE_NAME

echo "Menunggu PostgreSQL siap di ${DATABASE_HOST}:${DATABASE_PORT}..."
TIMEOUT=30
COUNT=0

until PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c '\q'; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $TIMEOUT ]; then
    echo "ERROR: PostgreSQL tidak bisa dijangkau setelah ${TIMEOUT} detik."
    echo "Host: ${DATABASE_HOST}, Port: ${DATABASE_PORT}, User: ${DATABASE_USER}, DB: ${DATABASE_NAME}"
    exit 1
  fi
  echo "PostgreSQL belum siap (${COUNT}/${TIMEOUT}) - tunggu 1 detik..."
  sleep 1
done

echo "PostgreSQL siap!"

echo "Menjalankan migrasi database..."
node scripts/migrate.js

echo "Menjalankan seed data awal..."
node scripts/seed.js

echo "Menjalankan seed akun petugas contoh..."
node scripts/seedSamplePetugas.js

echo "Memulai aplikasi..."
exec "$@"
