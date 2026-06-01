# Backend Digital Retribusi Sampah

Backend ini menggunakan Node.js, Express.js, JavaScript, dan PostgreSQL.

Dokumen acuan:

- `../AGENTS.md`
- `../docs/PROJECT_REQUIREMENTS.md`
- `../docs/DATABASE_DESIGN.md`
- `../docs/API_SPEC.md`

## Struktur

```text
backend/
  src/
    config/
    routes/
    controllers/
    services/
    repositories/
    middlewares/
    validators/
    utils/
    app.js
    server.js
  database/
    migrations/
    seeds/
  tests/
  .env.example
  package.json
  README.md
```

## Prinsip

- JavaScript, bukan TypeScript.
- Express.js untuk HTTP server.
- PostgreSQL untuk database.
- Service layer untuk business logic.
- Repository pattern untuk akses database.
- JWT authentication untuk seluruh endpoint aplikasi.
- Pagination wajib untuk data besar.
- Soft delete untuk master data.
- Audit log wajib untuk perubahan penting.
- Validasi request wajib sebelum masuk ke service layer.

## Menjalankan Backend

1. Salin `.env.example` menjadi `.env`.
2. Sesuaikan konfigurasi PostgreSQL dan JWT secret.
3. Install dependency.
4. Jalankan server.

```bash
npm install
npm run dev
```

## Catatan

Skeleton ini belum mendefinisikan endpoint aplikasi dan belum berisi SQL migration. Endpoint harus mengikuti `../docs/API_SPEC.md`, sedangkan struktur database harus mengikuti `../docs/DATABASE_DESIGN.md`.
