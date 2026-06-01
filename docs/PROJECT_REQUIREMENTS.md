# Project Requirements: Digital Retribusi Sampah

## 1. Ringkasan

Digital Retribusi Sampah adalah sistem berbasis web dan PWA untuk mengelola administrasi iuran atau retribusi layanan persampahan. Sistem ini mendukung pengelolaan data warga, tarif retribusi, pembuatan tagihan bulanan, pencatatan pembayaran lapangan, pemantauan pembayaran secara realtime, serta pelaporan operasional.

Target awal sistem adalah mampu melayani minimal 100.000 pelanggan dengan performa yang stabil, data yang akurat, dan proses kerja yang mudah digunakan oleh admin, petugas lapangan, dan warga.

## 2. Tujuan Sistem

- Mendigitalisasi proses penagihan dan pembayaran retribusi sampah.
- Mengurangi pencatatan manual dan risiko kehilangan data pembayaran.
- Memudahkan petugas mencatat pembayaran langsung dari lapangan.
- Memudahkan warga melihat tagihan dan riwayat pembayaran.
- Menyediakan dashboard realtime untuk memonitor status pembayaran.
- Menyediakan laporan harian, bulanan, dan tahunan untuk kebutuhan administrasi dan evaluasi.
- Menyiapkan fondasi sistem yang dapat diskalakan untuk minimal 100.000 pelanggan.

## 3. Ruang Lingkup

### 3.1 Dalam Ruang Lingkup

- Manajemen data warga atau pelanggan.
- Manajemen tarif retribusi.
- Pembuatan tagihan bulanan.
- Pencatatan pembayaran oleh petugas lapangan.
- Portal warga untuk melihat tagihan dan riwayat pembayaran.
- Dashboard monitoring pembayaran.
- Laporan pembayaran harian, bulanan, dan tahunan.
- Sistem berbasis React, Node.js, Express.js, PostgreSQL, dan PWA.

### 3.2 Di Luar Ruang Lingkup Tahap Awal

- Integrasi payment gateway.
- Integrasi sistem perbankan.
- Integrasi perangkat IoT atau timbangan sampah.
- Aplikasi native Android atau iOS.
- Modul akuntansi penuh.
- Modul manajemen armada pengangkut sampah.

## 4. Aktor Sistem

### 4.1 Admin

Admin bertanggung jawab mengelola konfigurasi utama dan data operasional sistem.

Kebutuhan utama:

- Mengelola data warga.
- Mengelola data petugas.
- Mengelola tarif retribusi.
- Membuat dan memvalidasi tagihan bulanan.
- Memantau pembayaran.
- Mengakses dan mengekspor laporan.

### 4.2 Petugas Lapangan

Petugas lapangan bertanggung jawab mencatat pembayaran warga secara langsung di lapangan.

Kebutuhan utama:

- Mencari data warga.
- Melihat status tagihan warga.
- Mencatat pembayaran.
- Melihat riwayat pembayaran yang dicatat.
- Tetap dapat menggunakan fitur inti melalui PWA di perangkat mobile.

### 4.3 Warga

Warga adalah pelanggan layanan persampahan.

Kebutuhan utama:

- Melihat daftar tagihan.
- Melihat status pembayaran.
- Melihat riwayat pembayaran.
- Mengakses sistem melalui browser mobile atau PWA.

### 4.4 Pimpinan atau Pengawas

Pimpinan atau pengawas membutuhkan ringkasan performa pembayaran dan laporan periodik.

Kebutuhan utama:

- Melihat dashboard pembayaran.
- Melihat tren pembayaran.
- Mengakses laporan harian, bulanan, dan tahunan.

## 5. Kebutuhan Fungsional

### 5.1 Manajemen Data Warga

Sistem harus menyediakan fitur bagi admin untuk mengelola data warga.

Data minimal:

- Nomor pelanggan.
- Nama warga.
- Nomor identitas atau NIK jika dibutuhkan.
- Alamat lengkap.
- RT, RW, kelurahan, kecamatan, dan wilayah layanan.
- Nomor telepon.
- Status pelanggan.
- Kategori pelanggan.
- Tanggal mulai berlangganan.

Kemampuan sistem:

- Tambah data warga.
- Ubah data warga.
- Nonaktifkan data warga.
- Cari dan filter data warga.
- Impor data warga secara massal.
- Mencegah duplikasi nomor pelanggan.

### 5.2 Manajemen Tarif Retribusi

Sistem harus menyediakan fitur bagi admin untuk mengelola tarif retribusi berdasarkan kategori pelanggan atau wilayah layanan.

Data minimal:

- Nama tarif.
- Kategori pelanggan.
- Nominal tarif bulanan.
- Wilayah berlaku jika diperlukan.
- Status aktif.
- Tanggal mulai berlaku.

Kemampuan sistem:

- Tambah tarif.
- Ubah tarif.
- Nonaktifkan tarif.
- Menyimpan riwayat perubahan tarif.
- Menggunakan tarif aktif saat pembuatan tagihan bulanan.

### 5.3 Pembuatan Tagihan Bulanan

Sistem harus mendukung pembuatan tagihan bulanan untuk pelanggan aktif.

Kemampuan sistem:

- Membuat tagihan berdasarkan periode bulan dan tahun.
- Menggunakan tarif yang berlaku untuk masing-masing pelanggan.
- Mencegah duplikasi tagihan untuk periode yang sama.
- Mendukung pembuatan tagihan massal.
- Menandai status tagihan: belum dibayar, sebagian dibayar, lunas, dibatalkan.
- Menyimpan audit trail proses pembuatan tagihan.

### 5.4 Pencatatan Pembayaran Lapangan

Sistem harus memungkinkan petugas mencatat pembayaran warga dari perangkat mobile.

Data minimal pembayaran:

- Nomor pembayaran.
- Nomor pelanggan.
- Periode tagihan.
- Nominal dibayar.
- Metode pembayaran.
- Tanggal dan waktu pembayaran.
- Petugas pencatat.
- Lokasi pencatatan jika tersedia dari perangkat.
- Catatan opsional.

Kemampuan sistem:

- Mencari warga berdasarkan nomor pelanggan, nama, atau alamat.
- Melihat tagihan terbuka milik warga.
- Mencatat pembayaran penuh atau sebagian.
- Menghasilkan bukti pembayaran digital.
- Mencegah pencatatan ganda untuk transaksi yang sama.
- Menyinkronkan status pembayaran ke dashboard.

### 5.5 Portal Warga

Sistem harus menyediakan akses bagi warga untuk melihat informasi tagihan dan pembayaran.

Kemampuan sistem:

- Login atau verifikasi warga.
- Melihat tagihan aktif.
- Melihat status tagihan.
- Melihat riwayat pembayaran.
- Melihat bukti pembayaran.
- Mengakses sistem dari browser mobile dan PWA.

### 5.6 Dashboard Realtime

Sistem harus menyediakan dashboard untuk memonitor pembayaran secara realtime atau mendekati realtime.

Informasi minimal:

- Total tagihan periode berjalan.
- Total pembayaran periode berjalan.
- Jumlah pelanggan lunas.
- Jumlah pelanggan belum bayar.
- Persentase kolektibilitas.
- Pembayaran terbaru.
- Ringkasan per wilayah.
- Ringkasan per petugas.

Kebutuhan teknis:

- Dashboard harus diperbarui otomatis tanpa refresh manual.
- Data dashboard harus konsisten dengan data transaksi.
- Sistem harus menyediakan filter periode dan wilayah.

### 5.7 Laporan

Sistem harus menyediakan laporan harian, bulanan, dan tahunan.

Jenis laporan minimal:

- Laporan pembayaran harian.
- Laporan pembayaran bulanan.
- Laporan pembayaran tahunan.
- Laporan tunggakan.
- Laporan kolektibilitas per wilayah.
- Laporan kinerja petugas.

Kemampuan sistem:

- Filter berdasarkan periode, wilayah, status, dan petugas.
- Ekspor laporan ke CSV atau Excel.
- Ringkasan total nominal dan jumlah transaksi.
- Jejak audit untuk data laporan penting.

## 6. Kebutuhan Non-Fungsional

### 6.1 Skalabilitas

- Sistem harus dirancang untuk minimal 100.000 pelanggan.
- Pembuatan tagihan massal harus diproses secara efisien.
- Query dashboard dan laporan harus menggunakan indeks database yang tepat.
- Proses berat seperti generate tagihan dan ekspor laporan besar sebaiknya dijalankan sebagai background job.

### 6.2 Performa

Target awal:

- Halaman utama dashboard terbuka dalam waktu kurang dari 3 detik pada koneksi normal.
- Pencarian warga menampilkan hasil dalam waktu kurang dari 2 detik untuk data 100.000 pelanggan.
- Pencatatan pembayaran selesai dalam waktu kurang dari 3 detik setelah submit.
- Laporan besar menggunakan mekanisme ekspor asinkron jika proses melebihi batas waktu respons normal.

### 6.3 Keamanan

- Sistem harus menggunakan autentikasi untuk admin, petugas, dan warga.
- Sistem harus menerapkan otorisasi berbasis peran.
- Password harus disimpan menggunakan algoritma hashing yang aman.
- Akses API harus divalidasi di sisi server.
- Data transaksi pembayaran tidak boleh dapat diubah tanpa jejak audit.
- Aktivitas penting harus dicatat dalam audit log.

### 6.4 Reliabilitas Data

- Nomor pelanggan harus unik.
- Nomor tagihan harus unik per periode dan pelanggan.
- Nomor pembayaran harus unik.
- Transaksi pembayaran harus menggunakan mekanisme database transaction.
- Status tagihan harus dihitung secara konsisten dari total kewajiban dan total pembayaran.

### 6.5 PWA dan Mobile Experience

- Sistem harus dapat dipasang sebagai PWA pada perangkat mobile.
- Tampilan petugas lapangan harus optimal untuk layar kecil.
- Fitur pencarian warga dan pencatatan pembayaran harus mudah digunakan di lapangan.
- Aplikasi harus memiliki manifest, service worker, dan strategi caching yang sesuai pada tahap implementasi.

### 6.6 Audit dan Kepatuhan Operasional

- Sistem harus mencatat siapa yang membuat, mengubah, atau membatalkan data penting.
- Pembatalan tagihan atau pembayaran harus memerlukan alasan.
- Laporan harus dapat ditelusuri ke data transaksi sumber.

## 7. Model Data Konseptual

Entitas utama:

- User: akun pengguna sistem.
- Role: peran pengguna seperti admin, petugas, warga, dan pengawas.
- Customer: data warga atau pelanggan.
- Tariff: data tarif retribusi.
- Bill: data tagihan bulanan.
- Payment: data pembayaran.
- Region: data wilayah layanan.
- AuditLog: catatan aktivitas penting.

Relasi utama:

- Satu warga memiliki banyak tagihan.
- Satu tagihan dapat memiliki satu atau lebih pembayaran.
- Satu tarif dapat berlaku untuk banyak warga.
- Satu petugas dapat mencatat banyak pembayaran.
- Satu wilayah memiliki banyak warga.

## 8. Arsitektur Teknologi

### 8.1 Frontend

Teknologi:

- React.
- PWA.

Tanggung jawab:

- Antarmuka admin.
- Antarmuka petugas lapangan.
- Portal warga.
- Dashboard realtime.
- Validasi input dasar di sisi klien.
- Integrasi API backend.

### 8.2 Backend

Teknologi:

- Node.js.
- Express.js.

Tanggung jawab:

- REST API.
- Autentikasi dan otorisasi.
- Logika bisnis tagihan dan pembayaran.
- Validasi data server-side.
- Integrasi realtime untuk dashboard.
- Pengelolaan background job untuk proses massal.

### 8.3 Database

Teknologi:

- PostgreSQL.

Tanggung jawab:

- Penyimpanan data master.
- Penyimpanan tagihan dan pembayaran.
- Penyimpanan audit log.
- Query laporan.
- Menjaga constraint, indeks, dan integritas transaksi.

## 9. Pertimbangan Skala 100.000 Pelanggan

Untuk mendukung minimal 100.000 pelanggan, sistem perlu memperhatikan:

- Indeks pada nomor pelanggan, nama pelanggan, wilayah, periode tagihan, status tagihan, dan tanggal pembayaran.
- Pagination wajib untuk daftar data besar.
- Pencarian harus menggunakan strategi yang efisien.
- Generate tagihan bulanan sebaiknya berjalan sebagai job bertahap.
- Ekspor laporan besar sebaiknya berjalan asinkron.
- Dashboard sebaiknya menggunakan agregasi teroptimasi atau materialized summary.
- Backup database harus dijadwalkan secara rutin.
- Monitoring error dan performa harus tersedia sejak awal produksi.

## 10. Hak Akses Awal

### Admin

- Kelola warga.
- Kelola tarif.
- Generate tagihan.
- Koreksi data sesuai izin.
- Akses seluruh laporan.
- Akses dashboard.

### Petugas

- Cari warga.
- Lihat tagihan.
- Catat pembayaran.
- Lihat pembayaran yang dicatat sendiri.

### Warga

- Lihat tagihan pribadi.
- Lihat riwayat pembayaran pribadi.
- Lihat bukti pembayaran pribadi.

### Pengawas

- Lihat dashboard.
- Lihat laporan.
- Tidak mengubah data transaksi.

## 11. Kriteria Penerimaan Awal

- Admin dapat membuat dan memperbarui data warga.
- Admin dapat membuat dan memperbarui tarif retribusi.
- Admin dapat membuat tagihan bulanan untuk pelanggan aktif tanpa duplikasi.
- Petugas dapat mencari warga dan mencatat pembayaran lapangan.
- Status tagihan berubah setelah pembayaran tercatat.
- Warga dapat melihat tagihan dan riwayat pembayaran miliknya.
- Dashboard menampilkan ringkasan pembayaran periode berjalan.
- Laporan harian, bulanan, dan tahunan dapat difilter dan diekspor.
- Sistem tetap responsif saat digunakan dengan dataset minimal 100.000 pelanggan.

## 12. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Duplikasi data warga | Tagihan dan pembayaran tidak akurat | Nomor pelanggan unik, validasi impor, dan proses deduplikasi |
| Pembayaran tercatat ganda | Laporan keuangan tidak valid | Nomor transaksi unik, idempotency key, dan audit log |
| Generate tagihan lambat | Operasional bulanan terganggu | Background job, batching, dan indeks database |
| Laporan besar lambat | Pengguna kesulitan mengambil data | Ekspor asinkron dan tabel agregasi |
| Koneksi lapangan tidak stabil | Petugas gagal mencatat pembayaran | Desain PWA dan mekanisme retry pada tahap implementasi |
| Hak akses terlalu luas | Risiko manipulasi data | Role-based access control dan audit trail |

## 13. Rekomendasi Tahap Implementasi

Tahap 1:

- Autentikasi dan role-based access control.
- Manajemen warga.
- Manajemen tarif.
- Generate tagihan bulanan.
- Pencatatan pembayaran oleh petugas.

Tahap 2:

- Portal warga.
- Dashboard realtime.
- Laporan dasar.
- Ekspor CSV atau Excel.

Tahap 3:

- Optimasi performa untuk 100.000 pelanggan.
- Background job.
- Audit log lengkap.
- Peningkatan fitur PWA.
- Monitoring dan observability.

## 14. Catatan Implementasi

Dokumen ini hanya mendefinisikan kebutuhan sistem dan struktur awal proyek. Pembuatan kode aplikasi, konfigurasi framework, skema database, dan implementasi API dilakukan pada tahap berikutnya setelah requirement ini disetujui.
