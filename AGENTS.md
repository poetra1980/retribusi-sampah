# AGENTS.md

## Pedoman Pengembangan Digital Retribusi Sampah

Dokumen ini menjadi pedoman seluruh pengembangan project Digital Retribusi Sampah. Semua keputusan teknis, struktur kode, desain API, desain database, dan implementasi fitur harus mengikuti aturan di dokumen ini serta dokumen pendukung di folder `docs/`.

Dokumen acuan utama:

- `docs/PROJECT_REQUIREMENTS.md`
- `docs/DATABASE_DESIGN.md`
- `docs/API_SPEC.md`

## 1. Tech Stack

### Frontend

- React.
- Aplikasi harus mendukung tampilan desktop dan mobile.
- Aplikasi harus dapat dikembangkan sebagai PWA.

### Backend

- Node.js.
- Express.js.
- JavaScript.
- Jangan menggunakan TypeScript kecuali ada keputusan project baru yang terdokumentasi.

### Database

- PostgreSQL.

### Mobile

- PWA.
- Prioritaskan pengalaman petugas lapangan di perangkat mobile.

## 2. Standar Backend

### 2.1 Bahasa dan Struktur

- Gunakan JavaScript, bukan TypeScript.
- Gunakan struktur modular berdasarkan domain atau modul fitur.
- Pisahkan tanggung jawab minimal menjadi:
  - Route layer.
  - Controller layer.
  - Service layer.
  - Repository layer.
  - Validation layer.
  - Middleware layer.

### 2.2 Service Layer

- Semua business logic wajib berada di service layer.
- Controller hanya bertugas menerima request, memanggil service, dan mengembalikan response.
- Service layer bertanggung jawab untuk:
  - Validasi bisnis.
  - Orkestrasi transaksi.
  - Pemanggilan repository.
  - Pembuatan audit log untuk aksi penting.
  - Pengelolaan error domain.

### 2.3 Repository Pattern

- Semua akses database wajib melalui repository.
- Controller tidak boleh menjalankan query database langsung.
- Service tidak boleh menyusun query SQL kompleks jika repository sudah tersedia.
- Repository bertanggung jawab untuk:
  - Query database.
  - Pagination query.
  - Filter query.
  - Mapping hasil database ke object aplikasi jika diperlukan.

### 2.4 Authentication dan Authorization

- Semua endpoint wajib menggunakan JWT Authentication, kecuali endpoint login dan refresh token.
- Authorization wajib berbasis role:
  - Admin.
  - Petugas.
  - Warga.
- Warga hanya boleh mengakses data miliknya sendiri.
- Petugas hanya boleh mengakses data operasional yang relevan dengan tugasnya.
- Admin dapat mengelola data master, tagihan, pembayaran, laporan, dan audit log sesuai spesifikasi API.

### 2.5 Pagination

- Semua endpoint yang mengembalikan data besar wajib menggunakan pagination.
- Gunakan `limit` dengan batas maksimal.
- Gunakan cursor pagination untuk data transaksi besar seperti:
  - Bills.
  - Payments.
  - Audit logs.
  - Customers dalam jumlah besar.
- Hindari endpoint yang mengembalikan seluruh data tanpa batas.

### 2.6 Soft Delete

- Master data wajib menggunakan soft delete atau status nonaktif.
- Data penting tidak boleh dihapus permanen melalui proses aplikasi normal.
- Contoh master data:
  - Users.
  - Officers.
  - Regions.
  - Customers.
  - Customer categories.
  - Tariffs.
  - Payment methods.

### 2.7 Audit Log

- Audit log wajib dibuat untuk perubahan penting.
- Aksi yang wajib diaudit:
  - Login gagal berulang.
  - Perubahan user dan role.
  - Perubahan data petugas.
  - Perubahan data warga.
  - Perubahan alamat warga.
  - Perubahan tarif.
  - Generate tagihan.
  - Pembatalan tagihan.
  - Pencatatan pembayaran.
  - Pembatalan pembayaran.
  - Ekspor laporan.
- Audit log tidak boleh menyimpan password atau data rahasia lain.

### 2.8 Validasi Request

- Validasi request wajib untuk seluruh endpoint.
- Validasi minimal mencakup:
  - Required field.
  - Tipe data.
  - Format UUID.
  - Format tanggal.
  - Range nominal uang.
  - Enum status.
  - Hak akses terhadap resource.
- Validasi bisnis dilakukan di service layer.
- Validasi payload dasar dapat dilakukan di validation middleware.

## 3. Standar Database

### 3.1 PostgreSQL

- Database utama adalah PostgreSQL.
- Desain database mengikuti `docs/DATABASE_DESIGN.md`.
- Gunakan tipe data yang sesuai:
  - `uuid` untuk primary key entitas utama.
  - `numeric(14,2)` untuk nominal uang.
  - `timestamptz` untuk timestamp.
  - `jsonb` hanya untuk data fleksibel seperti audit log atau parameter export.

### 3.2 Index

- Gunakan index pada kolom pencarian dan filter utama.
- Kolom yang wajib dipertimbangkan untuk index:
  - Nomor pelanggan.
  - Nama pelanggan.
  - Wilayah.
  - Status.
  - Periode tagihan.
  - Tanggal pembayaran.
  - Petugas.
  - Metode pembayaran.
  - Entity audit log.
- Jangan menambahkan index tanpa kebutuhan query yang jelas.

### 3.3 Hindari Query N+1

- Hindari query N+1 pada daftar data.
- Gunakan join, batching, atau query agregasi yang efisien.
- Untuk response list, ambil data relasi secara terkontrol dan hanya jika diperlukan.

### 3.4 Transaction

- Gunakan database transaction untuk proses yang harus konsisten.
- Transaction wajib untuk:
  - Pencatatan pembayaran.
  - Alokasi pembayaran ke tagihan.
  - Pembatalan pembayaran.
  - Generate tagihan bulanan.
  - Pembatalan tagihan.
  - Perubahan data yang melibatkan beberapa tabel.

### 3.5 Skala Data

- Sistem harus siap untuk minimal 100.000 pelanggan.
- Query daftar pelanggan, tagihan, pembayaran, dan audit log harus dirancang dengan pagination.
- Proses berat harus dipertimbangkan sebagai background job.
- Laporan besar tidak boleh memblokir request utama.

## 4. Standar Frontend

### 4.1 React

- Frontend menggunakan React.
- Struktur komponen harus modular.
- Pisahkan komponen UI, halaman, hooks, service API, dan state management bila diperlukan.

### 4.2 Responsive Design

- UI wajib responsif untuk mobile dan desktop.
- Prioritaskan workflow mobile untuk Petugas.
- Halaman dashboard dan laporan harus nyaman digunakan di desktop.

### 4.3 Reusable Components

- Gunakan reusable components untuk elemen yang berulang.
- Contoh:
  - Table.
  - Filter.
  - Search input.
  - Pagination.
  - Modal.
  - Form field.
  - Alert.
  - Loading indicator.
  - Empty state.

### 4.4 Loading dan Error State

- Loading state wajib untuk setiap proses async.
- Error state wajib untuk kegagalan request.
- Empty state wajib untuk daftar data kosong.
- Form harus menampilkan error validasi dengan jelas.

### 4.5 PWA

- Aplikasi harus disiapkan sebagai PWA.
- Perhatikan kebutuhan petugas lapangan:
  - Akses cepat dari mobile.
  - UI ringan.
  - Handling koneksi tidak stabil.
  - Retry untuk request penting jika diterapkan.

## 5. Standar Kode

### 5.1 Modular

- Kode harus modular dan dipisahkan berdasarkan tanggung jawab.
- Hindari file besar yang menangani terlalu banyak hal.
- Hindari duplikasi logic lintas modul.

### 5.2 Mudah Dipelihara

- Nama file, function, variable, dan module harus jelas.
- Hindari abstraksi yang tidak diperlukan.
- Komentar hanya digunakan untuk menjelaskan logic yang tidak langsung jelas.
- Error handling harus konsisten.

### 5.3 Mudah Dikembangkan

- Struktur project harus memudahkan penambahan modul baru.
- Kontrak API harus mengikuti `docs/API_SPEC.md`.
- Perubahan database harus mengacu pada `docs/DATABASE_DESIGN.md`.
- Perubahan fitur harus tetap sesuai `docs/PROJECT_REQUIREMENTS.md`.

### 5.4 Siap Skala Minimal 100.000 Pelanggan

- Hindari query tanpa pagination.
- Hindari pemrosesan massal sinkron yang berisiko timeout.
- Gunakan index sesuai pola akses.
- Gunakan transaction untuk menjaga konsistensi data.
- Gunakan summary table atau agregasi terkontrol untuk dashboard dan laporan.

## 6. Larangan

- Jangan membuat endpoint tanpa authentication kecuali login dan refresh token.
- Jangan menyimpan password plaintext.
- Jangan menghapus permanen master data melalui alur normal aplikasi.
- Jangan melakukan akses database langsung dari controller.
- Jangan membuat query list data besar tanpa pagination.
- Jangan mengabaikan audit log untuk perubahan penting.
- Jangan mengubah kontrak API tanpa memperbarui dokumentasi.
- Jangan membuat kode yang hanya berjalan untuk data kecil jika fitur tersebut akan dipakai pada data besar.

## 7. Prioritas Pengembangan

Urutan prioritas teknis:

1. Kebenaran data.
2. Keamanan akses.
3. Konsistensi transaksi.
4. Performa untuk data besar.
5. Kemudahan pemeliharaan.
6. Pengalaman pengguna mobile dan desktop.

## 8. Catatan

Dokumen ini berlaku untuk seluruh pengembangan project Digital Retribusi Sampah. Jika terjadi konflik antara implementasi dan dokumen ini, implementasi harus disesuaikan atau dokumen harus diperbarui secara sadar dan terdokumentasi.
