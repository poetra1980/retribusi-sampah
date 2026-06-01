#!/bin/sh
set -e

echo "Menunggu PostgreSQL siap..."
until PGPASSWORD=$DATABASE_PASSWORD psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c '\q' 2>/dev/null; do
  echo "PostgreSQL belum siap - tunggu 1 detik..."
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
