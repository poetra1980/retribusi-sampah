# Petunjuk Instalasi Digital Retribusi Sampah

## Persyaratan Sistem
- Windows 10/11, Linux, atau macOS
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (gratis)

## Cara Instalasi (Sekali)

### 1. Install Docker Desktop
- Download dari https://www.docker.com/products/docker-desktop/
- Install seperti biasa (restart komputer setelah selesai)
- Buka Docker Desktop dan pastikan statusnya **running**

### 2. Jalankan Aplikasi

Buka **Command Prompt** atau **PowerShell**, lalu:

```bash
# Masuk ke folder aplikasi
cd C:\Users\LENOVO\retribusi-sampah

# Jalankan aplikasi (pertama kali butuh waktu ~5 menit)
docker compose up -d
```

Tunggu sampai selesai. Cek status:
```bash
docker compose ps
```

Kedua service harus bertuliskan **Up** (running).

### 3. Akses Aplikasi

Buka browser: **http://localhost:3000**

- **Login Admin:** `admin` / `admin123`
- **Login Petugas:** `petugas1` / `petugas123`

### 4. Akses dari HP/jaringan lokal

Cari IP laptop:
- **Windows:** buka Command Prompt, ketik `ipconfig`, cari `IPv4 Address`
- Akses dari HP: `http://[IP_ANDA]:3000/pwa/login`

## Perintah Penting

```bash
# Matikan aplikasi (data tetap aman)
docker compose down

# Matikan aplikasi + hapus semua data
docker compose down -v

# Lihat log aplikasi
docker compose logs -f app

# Lihat log database
docker compose logs -f db

# Update aplikasi (setelah ada perubahan kode)
git pull
docker compose up -d --build
```

## Ubah Password Default

Edit file `docker-compose.yml`, ubah bagian:

```yaml
JWT_ACCESS_SECRET: rs-prod-access-secret-ganti123
JWT_REFRESH_SECRET: rs-prod-refresh-secret-ganti456
```

Ganti `ganti123` dan `ganti456` dengan kata rahasia sendiri.

Setelah diubah, jalankan ulang:
```bash
docker compose up -d --build
```

## Struktur File

```
retribusi-sampah/
├── docker-compose.yml     # Konfigurasi service
├── Dockerfile              # Build image aplikasi
├── docker-entrypoint.sh    # Script startup
├── backend/                # Kode backend
└── frontend/               # Kode frontend
```

## Backup & Restore Database

```bash
# Backup
docker compose exec db pg_dump -U postgres retribusi_sampah > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U postgres retribusi_sampah
```
