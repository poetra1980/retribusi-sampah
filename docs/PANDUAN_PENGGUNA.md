# Panduan Pengguna: Digital Retribusi Sampah

## Daftar Isi

1. [Tujuan Bisnis Aplikasi](#1-tujuan-bisnis-aplikasi)
2. [Aktor Sistem](#2-aktor-sistem)
3. [Menu dan Fungsinya](#3-menu-dan-fungsinya)
   - 3.1 [Dashboard](#31-dashboard)
   - 3.2 [Master Data - Wilayah](#32-master-data---wilayah)
   - 3.3 [Master Data - Kategori Pelanggan](#33-master-data---kategori-pelanggan)
   - 3.4 [Master Data - Metode Pembayaran](#34-master-data---metode-pembayaran)
   - 3.5 [Master Data - Periode Tagihan](#35-master-data---periode-tagihan)
   - 3.6 [Master Data - Pengguna](#36-master-data---pengguna)
   - 3.7 [Master Data - Petugas](#37-master-data---petugas)
   - 3.8 [Pelanggan](#38-pelanggan)
   - 3.9 [Tarif](#39-tarif)
   - 3.10 [Tagihan](#310-tagihan)
   - 3.11 [Pembayaran](#311-pembayaran)
   - 3.12 [Laporan](#312-laporan)
   - 3.13 [Audit Log](#313-audit-log)
   - 3.14 [Pengaturan](#314-pengaturan)
4. [Alur Kerja Aplikasi](#4-alur-kerja-aplikasi)
5. [Contoh Penggunaan Nyata](#5-contoh-penggunaan-nyata)
6. [Fitur yang Belum Selesai](#6-fitur-yang-belum-selesai)

---

## 1. Tujuan Bisnis Aplikasi

**Digital Retribusi Sampah** adalah sistem informasi berbasis web untuk mengelola administrasi iuran atau retribusi layanan persampahan di tingkat desa/kelurahan/kecamatan. Aplikasi ini menggantikan pencatatan manual (buku/kertas) dengan sistem digital yang dapat diakses melalui komputer dan ponsel.

### Masalah yang Dipecahkan

| Masalah | Solusi Aplikasi |
|---|---|
| Pencatatan pembayaran di buku mudah hilang atau rusak | Data tersimpan di database, tidak bisa hilang |
| Petugas harus bolak-balik ke kantor untuk setor data | Petugas mencatat langsung dari lapangan lewat ponsel |
| Warga sulit mengecek tagihan dan riwayat bayar | Warga bisa lihat tagihan online (rencana pengembangan) |
| Laporan bulanan harus dihitung manual | Laporan tersedia otomatis dalam hitungan detik |
| Data tunggakan tidak terpantau | Dashboard menunjukkan siapa saja yang belum bayar |
| Pembayaran ganda atau selisih hitungan | Sistem mencegah duplikasi dan mencatat semua transaksi |

### Target Pengguna

- **Pemerintah desa/kelurahan** yang mengelola retribusi sampah
- **Petugas lapangan** yang menagih dan menerima pembayaran dari warga
- **Warga** yang ingin mengecek tagihan (tahap pengembangan)
- **Pimpinan/pengawas** yang butuh laporan dan dashboard

---

## 2. Aktor Sistem

### Admin

Peran: mengelola seluruh data dan konfigurasi sistem.

Yang bisa dilakukan:
- Mengelola data wilayah, kategori pelanggan, metode pembayaran, periode tagihan
- Mengelola akun pengguna (admin, petugas, warga)
- Mengelola data petugas lapangan
- Mengelola data pelanggan/warga
- Mengelola tarif retribusi
- Generate tagihan bulanan
- Membatalkan tagihan atau pembayaran (dengan alasan)
- Melihat semua pembayaran, laporan, dan audit log
- Mengekspor laporan ke CSV/Excel

### Petugas Lapangan

Peran: mencatat pembayaran dari warga di lapangan.

Yang bisa dilakukan:
- Mencari data pelanggan/warga
- Melihat tagihan warga
- Mencatat pembayaran
- Melihat riwayat pembayaran yang dicatat sendiri
- Melihat dashboard

### Warga

Peran: melihat informasi tagihan dan pembayaran sendiri.

Yang bisa dilakukan (tahap pengembangan):
- Login ke portal warga
- Melihat tagihan aktif
- Melihat riwayat pembayaran
- Melihat bukti pembayaran

### Pimpinan/Pengawas

Peran: memantau kinerja pembayaran.

Yang bisa dilakukan:
- Melihat dashboard dan laporan
- Tidak bisa mengubah data transaksi

---

## 3. Menu dan Fungsinya

### 3.1 Dashboard

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin, Petugas |
| **Path** | `/` (halaman utama setelah login) |

#### Tujuan

Dashboard adalah halaman utama yang menampilkan ringkasan kondisi pembayaran secara cepat. Admin dan petugas langsung melihat gambaran besar begitu masuk ke aplikasi.

#### Data yang Ditampilkan

- **Total Tagihan** — jumlah total tagihan yang diterbitkan pada periode tertentu
- **Total Terbayar** — jumlah nominal yang sudah dibayarkan
- **Total Tunggakan** — jumlah nominal yang masih harus dibayar
- **Kolektibilitas (%)** — persentase tagihan yang sudah lunas
- **Jumlah Lunas** — berapa tagihan yang sudah dibayar penuh
- **Jumlah Belum Bayar** — berapa tagihan yang belum dibayar sama sekali
- **Jumlah Sebagian** — berapa tagihan yang baru dibayar sebagian
- **Pembayaran Terbaru** — daftar 10-20 transaksi pembayaran terakhir (siapa bayar, berapa, kapan)

#### Kapan Digunakan

- Setiap kali login untuk melihat kondisi terkini
- Saat rapat evaluasi untuk menunjukkan angka capaian
- Untuk memantau progres penagihan pertengahan bulan

#### Hubungan dengan Menu Lain

- Data bersumber dari **Tagihan** dan **Pembayaran**
- Filter wilayah menggunakan data **Wilayah**
- Filter periode menggunakan data **Periode Tagihan**

---

### 3.2 Master Data - Wilayah

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/regions` |
| **Nama di Menu** | Wilayah |

#### Tujuan

Mendata seluruh wilayah layanan secara hirarkis (bertingkat). Wilayah digunakan untuk mengelompokkan pelanggan, menentukan tugas petugas, dan menyusun laporan per wilayah.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Kode | Teks | Kode unik wilayah, contoh: `KEC01`, `KEL05`, `RW03`, `RT004` |
| Nama | Teks | Nama wilayah, contoh: `Kecamatan Sukajadi`, `Kelurahan Cipedes` |
| Level | Pilihan | Level wilayah: `Kecamatan`, `Kelurahan`, `RW`, `RT` |
| Status | Pilihan | `Aktif` atau `Nonaktif` |

#### Kapan Digunakan

- **Satu kali di awal** — saat pertama kali menjalankan sistem, input seluruh struktur wilayah
- **Saat ada pemekaran wilayah** — misalnya RT baru atau kelurahan baru
- **Saat ada wilayah yang dihapus/digabung** — ubah status menjadi nonaktif

#### Hubungan dengan Menu Lain

- Data wilayah digunakan oleh **Pelanggan** (setiap warga terdaftar di satu wilayah)
- Data wilayah digunakan oleh **Petugas** (setiap petugas memiliki wilayah tugas)
- Data wilayah digunakan oleh **Tarif** (tarif bisa berbeda per wilayah)
- Data wilayah digunakan oleh **Tagihan** (tagihan tercatat per wilayah)
- Data wilayah digunakan oleh **Laporan** dan **Dashboard** (filter dan ringkasan per wilayah)
- Data wilayah direferensi oleh **Alamat Pelanggan**

#### Contoh Struktur Wilayah

```
Kecamatan Sukajadi
  +-- Kelurahan Cipedes
  |     +-- RW 01
  |     |     +-- RT 001
  |     |     +-- RT 002
  |     +-- RW 02
  |           +-- RT 003
  |           +-- RT 004
  +-- Kelurahan Pasteur
        +-- RW 01
              +-- RT 005
              +-- RT 006
```

---

### 3.3 Master Data - Kategori Pelanggan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/customer-categories` |
| **Nama di Menu** | Kategori Pelanggan |

#### Tujuan

Mengelompokkan pelanggan berdasarkan jenis atau golongan. Kategori digunakan untuk membedakan tarif retribusi antar kelompok warga.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Kode | Teks | Kode unik kategori, contoh: `RTUH`, `RTPR`, `NIAGA` |
| Nama | Teks | Nama kategori, contoh: `Rumah Tangga Umum`, `Rumah Tangga PRJ` |
| Deskripsi | Teks (opsional) | Penjelasan kategori |
| Status | Pilihan | `Aktif` atau `Nonaktif` |

#### Kapan Digunakan

- **Satu kali di awal** — buat kategori yang berlaku di wilayah Anda
- **Saat ada kebijakan baru** — misalnya kategori khusus untuk usaha kecil

#### Contoh Kategori

| Kode | Nama | Contoh Penggunaan |
|---|---|---|
| `RTUH` | Rumah Tangga Umum | Rumah tempat tinggal biasa |
| `RTPR` | Rumah Tangga PRJ | Rumah mewah/besar (tarif lebih tinggi) |
| `NIAGA` | Niaga | Toko, warung, ruko |
| `KANTOR` | Kantor | Kantor pemerintahan/swasta |
| `PENDIDIKAN` | Pendidikan | Sekolah, madrasah, pesantren |
| `IBADAH` | Tempat Ibadah | Masjid, gereja, pura (biasanya gratis) |

#### Hubungan dengan Menu Lain

- Kategori digunakan oleh **Tarif** (setiap tarif terkait dengan satu kategori)
- Kategori digunakan oleh **Pelanggan** (setiap warga memiliki satu kategori)
- Kategori digunakan oleh **Tagihan** (tersimpan sebagai snapshot saat tagihan dibuat)
- Kategori digunakan oleh **Laporan** untuk filter dan analisis

---

### 3.4 Master Data - Metode Pembayaran

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/payment-methods` |
| **Nama di Menu** | Metode Pembayaran |

#### Tujuan

Mendaftarkan metode pembayaran yang tersedia. Metode pembayaran menentukan bagaimana warga membayar retribusi.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Kode | Teks | Kode unik metode, contoh: `CASH`, `QRIS` |
| Nama | Teks | Nama metode, contoh: `Tunai`, `QRIS` |
| Deskripsi | Teks (opsional) | Penjelasan metode |
| Butuh No. Referensi | Ya/Tidak | Apakah metode ini memerlukan nomor referensi dari luar (misalnya ID transaksi QRIS) |
| Status | Pilihan | `Aktif` atau `Nonaktif` |

#### Kapan Digunakan

- **Satu kali di awal** — daftarkan metode yang tersedia di wilayah Anda
- **Saat ada metode baru** — misalnya kerja sama dengan bank untuk transfer

#### Contoh Metode

| Kode | Nama | Keterangan |
|---|---|---|
| `CASH` | Tunai | Pembayaran langsung dengan uang tunai ke petugas |
| `QRIS` | QRIS | Pembayaran scan QRIS (kerja sama dengan penyedia QRIS) |
| `TRANSFER` | Transfer Bank | Warga transfer ke rekening desa/kelurahan |
| `VA` | Virtual Account | Warga bayar lewat virtual account bank |

#### Hubungan dengan Menu Lain

- Digunakan oleh **Pembayaran** (setiap transaksi mencatat metode yang dipakai)
- Digunakan oleh **Laporan** (laporan per metode pembayaran)
- Data awal default (seed data) seharusnya berisi CASH, QRIS, TRANSFER, VA

---

### 3.5 Master Data - Periode Tagihan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/billing-periods` |
| **Nama di Menu** | Periode Tagihan |

#### Tujuan

Mendefinisikan bulan-bulan penagihan. Setiap tagihan harus terikat pada satu periode (bulan dan tahun tertentu). Periode memastikan tidak ada tagihan ganda untuk bulan yang sama.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Tahun | Angka | Tahun periode, contoh: `2026` |
| Bulan | Angka (1-12) | Bulan periode, contoh: `6` untuk Juni |
| Tanggal Mulai | Tanggal | Tanggal awal periode, contoh: `2026-06-01` |
| Tanggal Akhir | Tanggal | Tanggal akhir periode, contoh: `2026-06-30` |
| Status | Pilihan | `Draft`, `Open`, `Closed` |

#### Alur Status Periode

```
Draft --> Open --> Closed
  ^                  |
  |                  |
  +---- Reopen -----+
```

- **Draft**: Periode baru dibuat, tagihan belum bisa digenerate
- **Open**: Periode aktif, tagihan bisa dibuat dan pembayaran bisa dicatat
- **Closed**: Periode ditutup, tidak bisa menambah tagihan atau pembayaran baru (kecuali dibuka ulang)

#### Kapan Digunakan

- **Setiap bulan** — buat periode baru untuk bulan berikutnya
- **Saat tahun baru** — buat periode untuk 12 bulan ke depan (bisa sekaligus)
- **Saat ada koreksi** — buka ulang periode yang sudah closed jika ada pembayaran yang perlu dicatat

#### Hubungan dengan Menu Lain

- Digunakan oleh **Tagihan** (setiap tagihan terikat ke satu periode)
- Digunakan oleh **Dashboard** (data per periode)
- Digunakan oleh **Laporan** (laporan bulanan/tahunan berdasarkan periode)

---

### 3.6 Master Data - Pengguna

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/users` |
| **Nama di Menu** | Pengguna |

#### Tujuan

Mengelola akun yang bisa login ke aplikasi. Setiap pengguna (admin, petugas, warga) memerlukan akun dengan hak akses sesuai perannya.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Username | Teks | Nama pengguna untuk login, harus unik |
| Email | Teks (opsional) | Alamat email |
| No. Telepon | Teks (opsional) | Nomor telepon |
| Password | Teks | Kata sandi (minimal 8 karakter) |
| Nama Lengkap | Teks | Nama asli pengguna |
| Status | Pilihan | `Active`, `Inactive`, `Locked` |
| Role | Pilihan ganda | Peran: `Admin`, `Petugas`, `Warga` |

#### Kapan Digunakan

- **Satu kali di awal** — buat akun admin utama, lalu akun untuk setiap petugas
- **Saat ada petugas baru** — buat akun baru dengan role Petugas
- **Saat ada warga yang ingin akses portal** — buat akun dengan role Warga (tahap pengembangan)
- **Saat ada pengguna berhenti** — nonaktifkan akun

#### Aturan Penting

- Satu orang bisa punya lebih dari satu role (misalnya Admin merangkap Petugas)
- Username, email, dan nomor telepon harus unik
- Admin tidak bisa menonaktifkan akun sendiri jika hanya satu admin aktif
- Reset password harus dicatat di audit log

#### Hubungan dengan Menu Lain

- Akun dengan role **Petugas** harus dilengkapi data di menu **Petugas** (profil petugas)
- Akun dengan role **Warga** bisa ditautkan ke data **Pelanggan** (tahap pengembangan)
- Setiap aktivitas penting dicatat di **Audit Log** dengan siapa pelakunya

---

### 3.7 Master Data - Petugas

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/master/officers` |
| **Nama di Menu** | Petugas |

#### Tujuan

Mendata profil petugas lapangan yang akan menagih dan menerima pembayaran. Data petugas menghubungkan akun pengguna (login) dengan profil operasional di lapangan.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Akun Pengguna | Pilihan | Akun user yang sudah dibuat dengan role Petugas |
| Nomor Petugas | Teks | Nomor induk petugas, unik |
| Nama Lengkap | Teks | Nama petugas |
| No. Telepon | Teks (opsional) | Nomor telepon operasional |
| Wilayah Tugas | Pilihan | Wilayah (data dari menu Wilayah) yang menjadi area tugas |
| Status | Pilihan | `Active`, `Inactive`, `Suspended` |
| Tanggal Mulai | Tanggal | Tanggal mulai bertugas |

#### Kapan Digunakan

- **Setelah akun petugas dibuat** — lengkapi profil petugas di menu ini
- **Saat mutasi petugas** — ubah wilayah tugas
- **Saat petugas berhenti** — nonaktifkan

#### Hubungan dengan Menu Lain

- Data petugas digunakan oleh **Pembayaran** (setiap pembayaran dicatat oleh petugas)
- Data petugas digunakan oleh **Dashboard** (ringkasan per petugas)
- Data petugas digunakan oleh **Laporan** (laporan kinerja petugas)
- Wilayah tugas petugas diambil dari data **Wilayah**

#### Catatan Penting

> **Fitur ini masih dalam pengembangan (belum selesai).** Backend untuk CRUD petugas belum tersedia. Lihat bagian [Fitur yang Belum Selesai](#6-fitur-yang-belum-selesai) untuk detail.

---

### 3.8 Pelanggan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin, Petugas |
| **Path** | `/customers` |
| **Nama di Menu** | Pelanggan |

#### Tujuan

Mendata seluruh warga/pelanggan layanan persampahan. Ini adalah data inti yang menjadi dasar pembuatan tagihan dan pencatatan pembayaran.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Nomor Pelanggan | Teks | Nomor unik pelanggan, contoh: `WGC-000001` |
| NIK | Teks (opsional) | Nomor Induk Kependudukan |
| Nama Lengkap | Teks | Nama warga |
| No. Telepon | Teks (opsional) | Nomor telepon/hp |
| Wilayah | Pilihan | Wilayah tempat tinggal (dari menu Wilayah) |
| Kategori | Pilihan | Kategori pelanggan (dari menu Kategori Pelanggan) |
| Status | Pilihan | `Active`, `Inactive`, `Suspended` |
| Tanggal Mulai | Tanggal | Tanggal mulai berlangganan |

#### Data Alamat (Detail, baca-saja di form saat ini)

| Field | Tipe | Keterangan |
|---|---|---|
| Alamat Lengkap | Teks | Deskripsi lokasi rumah |
| RT | Teks | RT |
| RW | Teks | RW |
| Kode TPS | Teks (opsional) | Kode Tempat Pembuangan Sampah |
| Nama TPS | Teks (opsional) | Nama TPS |
| Latitude/Longitude | Angka (opsional) | Koordinat lokasi rumah |

#### Kapan Digunakan

- **Satu kali di awal** — input seluruh warga yang menjadi pelanggan
- **Saat ada warga baru** — misalnya warga pindah atau bangun rumah baru
- **Saat ada perubahan data** — misalnya pindah kategori atau ganti nomor telepon
- **Saat warga berhenti** — nonaktifkan dengan alasan dan tanggal berakhir
- **Petugas** mencari warga saat akan mencatat pembayaran di lapangan

#### Pencarian dan Filter

Petugas dan admin bisa mencari warga berdasarkan:
- Nomor pelanggan
- Nama
- Wilayah
- Kategori
- Status

#### Hubungan dengan Menu Lain

- Setiap pelanggan terdaftar di satu **Wilayah** dan satu **Kategori**
- Tagihan dibuat untuk setiap pelanggan aktif (menu **Tagihan**)
- Pembayaran dicatat per pelanggan (menu **Pembayaran**)
- Data pelanggan digunakan di **Dashboard** dan **Laporan**

---

### 3.9 Tarif

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/tariffs` |
| **Nama di Menu** | Tarif |

#### Tujuan

Menentukan besaran iuran retribusi sampah per bulan. Tarif bisa berbeda berdasarkan kategori pelanggan dan/atau wilayah.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Kode | Teks | Kode unik tarif, contoh: `TARIF-RTU-01` |
| Nama | Teks | Nama tarif, contoh: `Retribusi Rumah Tangga Umum` |
| Kategori | Pilihan | Kategori pelanggan yang dikenakan tarif ini |
| Wilayah | Pilihan (opsional) | Wilayah berlaku, kosong artinya semua wilayah |
| Nominal | Angka (Rp) | Besaran iuran per bulan, contoh: `25000` |
| Tanggal Mulai Berlaku | Tanggal | Tanggal tarif mulai digunakan |
| Tanggal Akhir Berlaku | Tanggal (opsional) | Tanggal tarif berakhir (jika ada perubahan) |
| Status | Pilihan | `Aktif` atau `Nonaktif` |

#### Aturan Penting

- Satu kategori pelanggan bisa punya tarif berbeda di wilayah berbeda
- Tarif yang sedang aktif digunakan saat **Generate Tagihan** bulanan
- Jika tarif berubah, tagihan bulan lalu tetap menggunakan tarif lama (sudah tersimpan sebagai snapshot)
- Perubahan nominal harus disertai alasan (tercatat di riwayat tarif)

#### Kapan Digunakan

- **Satu kali di awal** — buat tarif untuk setiap kategori pelanggan
- **Saat ada perubahan kebijakan** — misalnya kenaikan iuran tahunan
- **Saat ada kategori baru** — buat tarif untuk kategori tersebut

#### Contoh Tarif

| Nama Tarif | Kategori | Nominal |
|---|---|---|
| Retribusi Rumah Tangga Umum | Rumah Tangga Umum | Rp 25.000/bulan |
| Retribusi Rumah Tangga PRJ | Rumah Tangga PRJ | Rp 50.000/bulan |
| Retribusi Niaga Kecil | Niaga | Rp 75.000/bulan |
| Retribusi Kantor | Kantor | Rp 100.000/bulan |

#### Hubungan dengan Menu Lain

- Tarif terikat ke **Kategori Pelanggan** dan opsional **Wilayah**
- Tarif digunakan saat **Generate Tagihan** (sistem mencari tarif aktif untuk setiap pelanggan)
- Riwayat perubahan tarif tercatat di **Audit Log**

---

### 3.10 Tagihan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin, Petugas |
| **Path** | `/bills` |
| **Nama di Menu** | Tagihan |

#### Tujuan

Menerbitkan tagihan retribusi bulanan untuk setiap pelanggan aktif. Tagihan adalah dokumen yang menyatakan jumlah yang harus dibayar warga untuk bulan tertentu.

#### Data yang Ditampilkan

| Field | Keterangan |
|---|---|
| Nomor Tagihan | Nomor unik tagihan |
| Pelanggan | Nama dan nomor pelanggan |
| Periode | Bulan dan tahun tagihan |
| Wilayah | Wilayah pelanggan |
| Kategori | Kategori pelanggan |
| Nominal | Jumlah yang harus dibayar |
| Sudah Dibayar | Jumlah yang sudah dibayar (jika ada pembayaran sebagian) |
| Sisa Tagihan | Sisa yang harus dibayar |
| Status | `Belum Dibayar`, `Sebagian`, `Lunas`, `Dibatalkan` |
| Jatuh Tempo | Tanggal paling lambat pembayaran |

#### Generate Tagihan Bulanan

Proses pembuatan tagihan untuk semua pelanggan aktif dalam satu periode.

**Cara:**
1. Pastikan **Periode Tagihan** sudah dibuat dengan status `Open`
2. Pastikan **Tarif** sudah aktif untuk setiap kategori yang diperlukan
3. Buka menu **Tagihan**, klik tombol **Generate Tagihan**
4. Pilih periode dan tanggal jatuh tempo
5. Sistem akan membuat tagihan untuk semua pelanggan aktif
6. Tidak ada duplikasi — jika tagihan untuk periode itu sudah ada, tidak akan dibuat lagi

#### Pembatalan Tagihan

Admin dapat membatalkan tagihan dengan alasan tertentu (misalnya warga pindah di tengah bulan). Pembatalan dicatat di audit log.

#### Status Tagihan

| Status | Arti |
|---|---|
| `Belum Dibayar` | Tagihan aktif, belum ada pembayaran |
| `Sebagian` | Sudah dibayar tapi belum lunas |
| `Lunas` | Sudah dibayar penuh |
| `Dibatalkan` | Tagihan dibatalkan oleh admin |

#### Kapan Digunakan

- **Setiap awal bulan** — generate tagihan untuk bulan berjalan
- **Saat ada pemantauan** — lihat siapa saja yang sudah/belum bayar
- **Saat ada koreksi** — batalkan tagihan yang salah

#### Hubungan dengan Menu Lain

- Tagihan dibuat untuk **Pelanggan** berdasarkan **Tarif** yang aktif
- Tagihan terkait dengan **Periode Tagihan** tertentu
- **Pembayaran** mengurangi sisa tagihan (melalui alokasi pembayaran)
- Data tagihan digunakan di **Dashboard** dan **Laporan**

---

### 3.11 Pembayaran

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin, Petugas |
| **Path** | `/payments` |
| **Nama di Menu** | Pembayaran |

#### Tujuan

Mencatat transaksi pembayaran retribusi yang dilakukan oleh warga. Ini adalah menu utama bagi petugas lapangan.

#### Data yang Diisi (Saat Mencatat Pembayaran)

| Field | Tipe | Keterangan |
|---|---|---|
| Pelanggan | Pilihan/Cari | Cari warga berdasarkan nama atau nomor pelanggan |
| Petugas | Otomatis | Petugas yang sedang login (untuk petugas) |
| Metode Pembayaran | Pilihan | Tunai, QRIS, Transfer, dll. |
| Nominal | Angka (Rp) | Jumlah yang dibayarkan |
| Tanggal Pembayaran | Tanggal | Kapan pembayaran dilakukan |
| Catatan | Teks (opsional) | Catatan lapangan |
| Alokasi Tagihan | List | Pilih tagihan mana yang dibayar (bisa lebih dari satu periode) |

#### Alur Pencatatan Pembayaran

1. Petugas menemui warga
2. Petugas mencari data warga (nomor pelanggan/nama)
3. Sistem menampilkan tagihan yang belum lunas
4. Petugas memasukkan nominal pembayaran
5. Pilih metode pembayaran (misal: Tunai)
6. Sistem mengalokasikan pembayaran ke tagihan yang dipilih
7. Simpan → sistem membuat nomor pembayaran dan bukti pembayaran
8. Status tagihan berubah otomatis

#### Fitur Keamanan

- **Idempotency Key**: Mencegah pencatatan ganda jika jaringan tidak stabil
- **Audit Log**: Setiap pembayaran tercatat siapa yang mencatat, kapan, dan metode apa
- **Pembatalan (Void)**: Pembayaran yang salah bisa dibatalkan oleh Admin dengan alasan

#### Kapan Digunakan

- **Setiap hari** — petugas mencatat pembayaran dari warga
- **Saat ada pembayaran susulan** — warga bayar tagihan bulan lalu yang tertunggak
- **Saat ada koreksi** — Admin membatalkan pembayaran yang salah

#### Hubungan dengan Menu Lain

- Pembayaran dicatat untuk **Pelanggan**
- Pembayaran mengurangi **Tagihan** melalui alokasi
- Petugas yang mencatat terdaftar di menu **Petugas**
- Metode pembayaran dari menu **Metode Pembayaran**
- Data pembayaran digunakan di **Dashboard** dan **Laporan**

---

### 3.12 Laporan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/reports` |
| **Nama di Menu** | Laporan |

#### Tujuan

Menyediakan data ringkasan dan detail untuk kebutuhan administrasi, evaluasi, dan pertanggungjawaban.

#### Jenis Laporan

| Laporan | Keterangan |
|---|---|
| **Pembayaran Harian** | Detail pembayaran yang terjadi pada tanggal tertentu, total nominal, jumlah transaksi |
| **Pembayaran Bulanan** | Ringkasan pembayaran sebulan, bisa difilter per wilayah/petugas/metode |
| **Pembayaran Tahunan** | Ringkasan pembayaran setahun |
| **Tunggakan** | Daftar pelanggan yang belum membayar tagihan periode tertentu |
| **Kolektibilitas** | Persentase tagihan yang sudah lunas per wilayah |
| **Kinerja Petugas** | Ringkasan penagihan per petugas dalam rentang tanggal tertentu |

#### Filter Laporan

- Periode (tanggal mulai - tanggal akhir)
- Wilayah
- Petugas
- Metode Pembayaran
- Status Tagihan

#### Ekspor Laporan

Laporan bisa diekspor ke format **CSV** atau **Excel (XLSX)**. Proses ekspor untuk data besar berjalan di latar belakang (tidak membuat halaman hang).

#### Kapan Digunakan

- **Akhir bulan** — untuk laporan pertanggungjawaban ke atasan
- **Inspeksi mendadak** — untuk mengecek kondisi lapangan
- **Evaluasi tahunan** — untuk melihat tren pembayaran

#### Hubungan dengan Menu Lain

- Data laporan berasal dari **Tagihan** dan **Pembayaran**
- Filter menggunakan data **Wilayah**, **Petugas**, **Metode Pembayaran**
- Proses ekspor tercatat di **Audit Log**

---

### 3.13 Audit Log

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin |
| **Path** | `/audit-logs` |
| **Nama di Menu** | Audit Log |

#### Tujuan

Mencatat semua aktivitas penting dalam sistem untuk keperluan audit, keamanan, dan penelusuran jika terjadi masalah.

#### Aktivitas yang Tercatat

| Kelompok | Contoh Aktivitas |
|---|---|
| **Login & Keamanan** | Login berhasil/gagal, logout, perubahan password |
| **Data Wilayah** | Tambah/ubah/nonaktifkan wilayah |
| **Data Pelanggan** | Tambah/ubah/nonaktifkan pelanggan |
| **Data Petugas** | Tambah/ubah/nonaktifkan petugas |
| **Data Tarif** | Tambah/ubah/nonaktifkan tarif |
| **Tagihan** | Generate tagihan, batalkan tagihan |
| **Pembayaran** | Catat pembayaran, batalkan pembayaran |
| **Laporan** | Ekspor laporan |

#### Data yang Ditampilkan

| Field | Keterangan |
|---|---|
| Waktu | Kapan aktivitas terjadi |
| Pelaku | Siapa yang melakukan (nama user) |
| Role | Peran saat melakukan aksi |
| Aksi | Jenis aktivitas (misal: `customer.create`) |
| Target | Data yang diubah (tabel dan ID) |
| Detail | Nilai lama dan baru (untuk perubahan data) |
| Alasan | Alasan pembatalan (jika ada) |

#### Kapan Digunakan

- **Saat ada masalah** — lacak siapa yang mengubah data dan kapan
- **Audit rutin** — periksa aktivitas mencurigakan
- **Rekonsiliasi** — cocokkan catatan pembayaran dengan laporan

#### Hubungan dengan Menu Lain

- Audit log mencatat aktivitas dari semua menu lainnya
- Data audit log bersifat baca-saja, tidak bisa diubah/dihapus

---

### 3.14 Pengaturan

| Informasi | Deskripsi |
|---|---|
| **Akses** | Admin, Petugas |
| **Path** | `/settings` |
| **Nama di Menu** | Pengaturan |

#### Tujuan

Menu untuk mengubah password akun sendiri.

#### Data yang Diisi

| Field | Tipe | Keterangan |
|---|---|---|
| Password Lama | Teks | Password yang sedang digunakan |
| Password Baru | Teks | Password baru (minimal 8 karakter) |
| Konfirmasi Password | Teks | Ketik ulang password baru |

#### Kapan Digunakan

- **Saat pertama kali login** — ganti password default
- **Secara berkala** — perbarui password untuk keamanan
- **Saat ada indikasi kebocoran** — ganti password segera

#### Catatan

> Menu **Pengaturan** saat ini hanya berisi fitur ganti password. Fitur lain seperti pengaturan profil, notifikasi, dan konfigurasi aplikasi belum tersedia.

---

## 4. Alur Kerja Aplikasi

Berikut adalah alur kerja lengkap dari awal setup hingga pembayaran selesai.

### Tahap 1: Persiapan Awal (Dilakukan Admin Satu Kali)

```
1. Login sebagai Admin
       |
2. Buat data Wilayah (menu Wilayah)
   - Kecamatan --> Kelurahan --> RW --> RT
       |
3. Buat Kategori Pelanggan (menu Kategori Pelanggan)
   - Rumah Tangga Umum, Niaga, Kantor, dll.
       |
4. Buat Metode Pembayaran (menu Metode Pembayaran)
   - Tunai, QRIS, Transfer Bank
       |
5. Buat Periode Tagihan (menu Periode Tagihan)
   - Misal: Juni 2026, Juli 2026, ... setahun ke depan
       |
6. Buat akun Pengguna (menu Pengguna)
   - Akun untuk setiap petugas (role: Petugas)
       |
7. Buat data Petugas (menu Petugas)
   - Hubungkan akun petugas dengan profil dan wilayah tugas
       |
8. Buat Tarif (menu Tarif)
   - Tentukan nominal iuran per kategori/wilayah
```

### Tahap 2: Input Data Pelanggan

```
9. Input data pelanggan (menu Pelanggan)
   - Nama, NIK, alamat, wilayah, kategori
   - Bisa input satu-satu atau massal
       |
10. Verifikasi data pelanggan
    - Pastikan nomor pelanggan unik
    - Pastikan wilayah dan kategori sesuai
```

### Tahap 3: Siklus Bulanan

```
11. Awal bulan: Generate Tagihan (menu Tagihan)
    - Pilih periode (bulan ini)
    - Sistem membuat tagihan untuk semua pelanggan aktif
    - Tagihan muncul dengan status "Belum Dibayar"
       |
12. Selama bulan: Petugas menagih (setiap hari)
    - Petugas mendatangi warga
    - Buka menu Pembayaran, cari warga
    - Lihat tagihan yang belum lunas
    - Warga membayar (tunai/QRIS/dll)
    - Petugas catat pembayaran
    - Status tagihan berubah otomatis
       |
13. Akhir bulan: Evaluasi
    - Buka Dashboard untuk lihat ringkasan
    - Buka Laporan untuk data detail
    - Export laporan ke CSV/Excel
    - Tutup periode tagihan
```

### Tahap 4: Monitoring dan Audit

```
14. Pantau Dashboard (setiap saat)
    - Lihat progres pembayaran
    - Lihat wilayah dengan kolektibilitas rendah
       |
15. Periksa Audit Log (bila perlu)
    - Lacak perubahan data
    - Investigasi jika ada masalah
```

### Diagram Alur Sederhana

```
[Admin] Setup Wilayah, Kategori, Metode Bayar
       |
[Admin] Buat Periode Tagihan
       |
[Admin] Buat Pengguna & Petugas
       |
[Admin] Input Pelanggan
       |
[Admin] Buat Tarif
       |
[Admin] Generate Tagihan Bulanan -----> [Sistem] Cek tarif aktif, buat tagihan
       |
[Petugas] Catat Pembayaran -----------> [Sistem] Update status tagihan
       |
[Admin] Lihat Dashboard & Laporan
```

---

## 5. Contoh Penggunaan Nyata

### Skenario: Desa Sukamaju, Kecamatan Cipedes

**Profil Desa:**
- 1 kelurahan: Kelurahan Sukamaju
- 5 RW, masing-masing 4 RT (total 20 RT)
- 800 kepala keluarga (pelanggan)
- 1 petugas penagihan
- Iuran Rp 25.000/bulan untuk rumah tangga biasa

#### Langkah 1: Setup Wilayah

Admin membuat struktur wilayah:

```
Kecamatan Cipedes (level: Kecamatan)
  +-- Kelurahan Sukamaju (level: Kelurahan, parent: Kecamatan Cipedes)
        +-- RW 01 (level: RW, parent: Kelurahan Sukamaju)
        |     +-- RT 001 (level: RT, parent: RW 01)
        |     +-- RT 002 (level: RT, parent: RW 01)
        +-- RW 02
        |     +-- RT 003
        |     +-- RT 004
        +-- ... (seterusnya)
```

#### Langkah 2: Setup Kategori

| Kode | Nama | Nominal |
|---|---|---|
| `RTB` | Rumah Tangga Biasa | Rp 25.000 |
| `RTP` | Rumah Tangga PRJ | Rp 50.000 |
| `NIAGA` | Toko/Warung | Rp 75.000 |

#### Langkah 3: Setup Metode Pembayaran

| Kode | Nama |
|---|---|
| `CASH` | Tunai (pembayaran langsung ke petugas) |

#### Langkah 4: Setup Pengguna dan Petugas

1. Admin membuat akun untuk **Pak Budi** (petugas):
   - Username: `budi.sukamaju`
   - Password: sementara
   - Role: Petugas

2. Admin masuk ke menu Petugas, pilih akun Pak Budi:
   - Wilayah tugas: Kelurahan Sukamaju
   - Status: Aktif

#### Langkah 5: Setup Tarif

| Nama Tarif | Kategori | Nominal | Berlaku |
|---|---|---|---|
| Iuran RT Biasa | Rumah Tangga Biasa | Rp 25.000 | Semua wilayah |
| Iuran RT PRJ | Rumah Tangga PRJ | Rp 50.000 | Semua wilayah |
| Iuran Niaga | Niaga | Rp 75.000 | Semua wilayah |

#### Langkah 6: Input Pelanggan

Admin memasukkan 800 warga ke sistem. Contoh beberapa data:

| No. Pelanggan | Nama | Wilayah | Kategori |
|---|---|---|---|
| SKM-000001 | Siti Nurjanah | RT 001 / RW 01 | RTB |
| SKM-000002 | Ahmad Rojali | RT 001 / RW 01 | RTB |
| SKM-000003 | Warung Makmur | RT 001 / RW 01 | NIAGA |
| ... | ... | ... | ... |

#### Langkah 7: Generate Tagihan Bulan Juni 2026

1. Admin memastikan periode "Juni 2026" sudah dibuat dengan status Open
2. Buka menu Tagihan, klik Generate Tagihan
3. Pilih periode: Juni 2026
4. Sistem membuat 800 tagihan @ Rp 25.000 (kebanyakan RTB), sebagian @ Rp 50.000, sebagian @ Rp 75.000
5. Total tagihan: sekitar Rp 21.000.000

#### Langkah 8: Penagihan dan Pembayaran (Berjalan Selama Bulan)

**Hari 1:**
Pak Budi mendatangi RT 001:
1. Buka menu Pembayaran di ponsel
2. Cari "Siti Nurjanah" — muncul tagihan Juni Rp 25.000 (Belum Dibayar)
3. Bu Siti bayar Rp 25.000 tunai
4. Pak Budi catat: metode Tunai, nominal Rp 25.000
5. Simpan — status tagihan berubah jadi "Lunas"
6. Sistem kasih nomor bukti: `PAY-202606-SKM-000001`

**Hari 2:**
Pak Budi datangi Warung Makmur:
1. Cari "Warung Makmur"
2. Tagihan Juni Rp 75.000 (Belum Dibayar)
3. Pemilik toko bayar Rp 75.000
4. Catat dan simpan

**Hari ke-15:**
Pak Budi cek Dashboard dari ponsel:
- Dari 800 tagihan: 400 sudah lunas (50%)
- Total terkumpul: Rp 10.500.000
- Kolektibilitas: 50%

#### Langkah 9: Akhir Bulan

1. Admin buka Laporan Bulanan Juni 2026
2. Lihat ringkasan: dari 800 pelanggan, 750 lunas, 50 tunggakan
3. Total terkumpul: Rp 19.750.000 dari Rp 21.000.000
4. Kolektibilitas: 93,75%
5. Export laporan ke Excel untuk arsip
6. Tutup periode Juni 2026

---

## 6. Fitur yang Belum Selesai

Berikut adalah fitur-fitur yang tercantum dalam dokumentasi desain tetapi **belum diimplementasikan** atau masih belum lengkap.

### 6.1 CRUD Petugas (Kritis)

| Status | Belum ada backend |
|---|---|
| **Dampak** | Menu Petugas di frontend tidak bisa digunakan |
| **Frontend** | Halaman sudah ada tapi API calls akan gagal (404) |
| **Backend** | Tidak ada route, controller, service, repository, validator untuk officers |
| **Solusi Sementara** | Data petugas harus diinput langsung ke database via SQL |

### 6.2 Seed Data Database

| Status | Belum ada |
|---|---|
| **Dampak** | Aplikasi tidak bisa digunakan langsung setelah migrasi |
| **Data yang kurang** | Role (admin, petugas, warga), metode pembayaran default, admin default |
| **Solusi Sementara** | Input manual via SQL atau API |

### 6.3 Portal Warga

| Status | Belum ada |
|---|---|
| **Dampak** | Warga tidak bisa login untuk cek tagihan sendiri |
| **Yang sudah ada** | Backend API mendukung akses role warga, tabel `customer_user_accounts` sudah dibuat |
| **Yang kurang** | Halaman portal warga (frontend) belum dibuat |

### 6.4 Ekspor Laporan (Asinkron)

| Status | Tidak berfungsi penuh |
|---|---|
| **Dampak** | Tombol export membuat job dengan status pending tapi tidak pernah selesai |
| **Penyebab** | Belum ada background worker yang memproses export job |

### 6.5 Dashboard Realtime

| Status | Belum realtime |
|---|---|
| **Dampak** | Dashboard tidak otomatis refresh, harus reload halaman |
| **Penyebab** | Belum ada WebSocket/SSE; dashboard masih query langsung ke tabel transaksi |

### 6.6 Bukti Pembayaran (Receipt)

| Status | Belum ada output |
|---|---|
| **Dampak** | Warga tidak bisa menerima bukti pembayaran digital |
| **Penyebab** | Receipt tercatat di database tapi belum ada format output (PDF/HTML) |

### 6.7 PWA (Progressive Web App)

| Status | Belum dikonfigurasi |
|---|---|
| **Dampak** | Aplikasi tidak bisa diinstall sebagai aplikasi di ponsel |
| **Yang kurang** | Service worker, manifest.json, strategi caching |

### 6.8 Alamat Pelanggan (Manajemen)

| Status | Frontend belum ada |
|---|---|
| **Dampak** | Alamat pelanggan hanya tampil baca-saja, tidak bisa ditambah/diedit |
| **Backend** | Full CRUD sudah tersedia |

### 6.9 Tautan Akun Warga

| Status | Frontend belum ada |
|---|---|
| **Dampak** | Tidak bisa menghubungkan akun login warga dengan data pelanggan |
| **Backend** | API `link-user` dan `unlink-user` sudah tersedia |

### 6.10 Validator Metode Pembayaran

| Status | File validator belum ada |
|---|---|
| **Dampak** | Validasi request body untuk payment methods mungkin kurang ketat |

### 6.11 Pengaturan (Settings) Minimal

| Status | Hanya ganti password |
|---|---|
| **Dampak** | Tidak bisa ubah profil, tidak ada konfigurasi sistem |
| **Rencana** | Seharusnya ada: ubah profil, notifikasi, konfigurasi aplikasi |

---

## Lampiran: Glossary

| Istilah | Arti |
|---|---|
| **Retribusi** | Iuran/pungutan yang dibayar warga untuk layanan persampahan |
| **Kolektibilitas** | Persentase tagihan yang sudah dibayar dari total tagihan |
| **Tunggakan** | Tagihan yang belum dibayar melewati jatuh tempo |
| **Generate Tagihan** | Proses membuat tagihan untuk semua pelanggan aktif |
| **Alokasi Pembayaran** | Menentukan tagihan mana yang dibayar dari suatu pembayaran |
| **Snapshot** | Data yang disimpan saat tertentu (misal tarif saat tagihan dibuat) untuk menjaga konsistensi historis |
| **Void** | Pembatalan transaksi pembayaran (tidak dihapus, tapi ditandai batal) |
| **Soft Delete** | Data tidak dihapus dari database, hanya ditandai nonaktif |
| **PWA** | Progressive Web App — aplikasi web yang bisa diinstall seperti aplikasi native |
| **Idempotency Key** | Kode unik untuk mencegah pencatatan ganda jika request dikirim dua kali |
| **Cursor Pagination** | Teknik mengambil data halaman berikutnya menggunakan penanda (cursor), bukan nomor halaman |

---

*Dokumen ini dibuat berdasarkan analisis kode aplikasi Digital Retribusi Sampah versi pengembangan. Beberapa fitur mungkin berubah seiring pengembangan berjalan.*

*Terakhir diperbarui: Juni 2026*
