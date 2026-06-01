# Database Design: Digital Retribusi Sampah

## 1. Ringkasan

Dokumen ini mendefinisikan desain database PostgreSQL untuk sistem Digital Retribusi Sampah. Desain ini disusun untuk mendukung modul Wilayah, Warga, Tarif, Tagihan, Pembayaran, Dashboard, dan Audit Log dengan target minimal 100.000 pelanggan.

Dokumen ini bukan SQL migration dan tidak berisi kode backend. Semua struktur di bawah adalah rancangan teknis database yang menjadi acuan implementasi berikutnya.

## 2. Prinsip Desain

- Menggunakan `uuid` sebagai primary key untuk entitas utama agar aman untuk integrasi dan sinkronisasi.
- Menggunakan `numeric(14,2)` untuk nominal uang agar tidak terjadi kesalahan presisi.
- Menyimpan `created_at`, `updated_at`, dan audit actor pada tabel operasional penting.
- Menghindari hard delete untuk data master dan transaksi penting.
- Menggunakan constraint unik untuk mencegah duplikasi data bisnis.
- Menggunakan index komposit untuk query umum seperti pencarian warga, tagihan per periode, pembayaran per tanggal, dan dashboard per wilayah.
- Menyiapkan tabel agregasi dashboard agar query realtime tidak selalu menghitung ulang dari tabel transaksi besar.

## 3. Daftar Seluruh Tabel

| No | Tabel | Modul | Fungsi |
| --- | --- | --- | --- |
| 1 | `roles` | Akses | Menyimpan daftar role sistem: Admin, Petugas, Warga |
| 2 | `users` | Akses | Menyimpan akun pengguna untuk login |
| 3 | `user_roles` | Akses | Menghubungkan user dengan role |
| 4 | `user_sessions` | Akses | Menyimpan sesi login dan refresh token persistence |
| 5 | `officers` | Petugas | Menyimpan profil petugas lapangan dan wilayah tugas utama |
| 6 | `regions` | Wilayah | Menyimpan hirarki wilayah layanan |
| 7 | `customer_categories` | Warga/Tarif | Menyimpan kategori warga atau pelanggan |
| 8 | `customers` | Warga | Menyimpan data warga atau pelanggan |
| 9 | `customer_addresses` | Warga/Wilayah | Menyimpan alamat pelanggan yang lebih detail, termasuk RT, RW, dan TPS |
| 10 | `customer_user_accounts` | Warga/Akses | Menghubungkan akun user warga dengan data pelanggan |
| 11 | `tariffs` | Tarif | Menyimpan tarif retribusi yang berlaku |
| 12 | `tariff_histories` | Tarif/Audit | Menyimpan riwayat perubahan tarif |
| 13 | `billing_periods` | Tagihan | Menyimpan periode tagihan bulanan |
| 14 | `bill_generation_batches` | Tagihan | Mencatat proses generate tagihan massal |
| 15 | `bills` | Tagihan | Menyimpan tagihan pelanggan per periode |
| 16 | `payment_methods` | Pembayaran | Menyimpan metode pembayaran seperti tunai, QRIS, transfer bank, dan virtual account |
| 17 | `payments` | Pembayaran | Menyimpan transaksi pembayaran |
| 18 | `payment_allocations` | Pembayaran | Menghubungkan pembayaran ke tagihan yang dibayar |
| 19 | `payment_receipts` | Pembayaran | Menyimpan metadata bukti pembayaran |
| 20 | `dashboard_daily_summaries` | Dashboard | Menyimpan agregasi pembayaran harian |
| 21 | `dashboard_period_summaries` | Dashboard | Menyimpan agregasi tagihan dan pembayaran per periode |
| 22 | `audit_logs` | Audit Log | Menyimpan jejak aktivitas penting |
| 23 | `export_jobs` | Laporan | Menyimpan proses ekspor laporan besar |

## 4. Detail Tabel

### 4.1 `roles`

Fungsi: menyimpan role dasar sistem.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `smallserial` | Primary key |
| `code` | `varchar(30)` | Kode role: `admin`, `petugas`, `warga` |
| `name` | `varchar(100)` | Nama role |
| `description` | `text` | Deskripsi role |
| `created_at` | `timestamptz` | Waktu pembuatan data |

Primary key:

- `id`

Unique key:

- `code`

Index:

- `roles_code_uidx` pada `code`

Catatan data awal:

- Admin
- Petugas
- Warga

### 4.2 `users`

Fungsi: menyimpan akun pengguna untuk admin, petugas, dan warga.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `username` | `varchar(80)` | Username unik |
| `email` | `varchar(255)` | Email pengguna, nullable |
| `phone_number` | `varchar(30)` | Nomor telepon, nullable |
| `password_hash` | `text` | Hash password |
| `full_name` | `varchar(150)` | Nama lengkap |
| `status` | `varchar(20)` | `active`, `inactive`, `locked` |
| `last_login_at` | `timestamptz` | Login terakhir |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |
| `deleted_at` | `timestamptz` | Soft delete |

Primary key:

- `id`

Unique key:

- `username`
- `email` jika tidak null
- `phone_number` jika tidak null

Index:

- `users_username_uidx` pada `username`
- `users_email_uidx` pada `email` dengan partial index `WHERE email IS NOT NULL`
- `users_phone_uidx` pada `phone_number` dengan partial index `WHERE phone_number IS NOT NULL`
- `users_status_idx` pada `status`

### 4.3 `user_roles`

Fungsi: menghubungkan user dengan satu atau lebih role.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `user_id` | `uuid` | Foreign key ke `users.id` |
| `role_id` | `smallint` | Foreign key ke `roles.id` |
| `created_at` | `timestamptz` | Waktu role diberikan |

Primary key:

- `user_id`, `role_id`

Foreign key:

- `user_id` ke `users.id`
- `role_id` ke `roles.id`

Index:

- `user_roles_user_id_idx` pada `user_id`
- `user_roles_role_id_idx` pada `role_id`

### 4.4 `user_sessions`

Fungsi: menyimpan sesi login pengguna dan persistence refresh token. Tabel ini mendukung logout yang tahan restart server, refresh token rotation, deteksi token reuse, dan manajemen sesi per perangkat.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key ke `users.id` |
| `refresh_token_hash` | `text` | Hash refresh token aktif, bukan token plaintext |
| `refresh_token_jti` | `uuid` | JWT ID refresh token aktif |
| `previous_refresh_token_jti` | `uuid` | JWT ID token sebelumnya setelah rotation, nullable |
| `status` | `varchar(20)` | `active`, `revoked`, `expired` |
| `ip_address` | `inet` | IP saat sesi dibuat, nullable |
| `user_agent` | `text` | User agent perangkat/browser, nullable |
| `device_name` | `varchar(150)` | Nama perangkat jika tersedia, nullable |
| `last_used_at` | `timestamptz` | Waktu terakhir refresh token dipakai |
| `expires_at` | `timestamptz` | Waktu kedaluwarsa refresh token aktif |
| `revoked_at` | `timestamptz` | Waktu sesi dicabut, nullable |
| `revoked_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `revocation_reason` | `text` | Alasan pencabutan sesi, nullable |
| `created_at` | `timestamptz` | Waktu sesi dibuat |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `user_id` ke `users.id`
- `revoked_by` ke `users.id`

Unique key:

- `refresh_token_jti`
- `refresh_token_hash`

Index:

- `user_sessions_user_status_idx` pada `user_id`, `status`
- `user_sessions_refresh_token_jti_uidx` pada `refresh_token_jti`
- `user_sessions_refresh_token_hash_uidx` pada `refresh_token_hash`
- `user_sessions_previous_refresh_token_jti_idx` pada `previous_refresh_token_jti` dengan partial index `WHERE previous_refresh_token_jti IS NOT NULL`
- `user_sessions_expires_at_idx` pada `expires_at`
- `user_sessions_active_idx` pada `user_id`, `expires_at` dengan partial index `WHERE status = 'active'`
- `user_sessions_last_used_at_idx` pada `last_used_at DESC`

Catatan keamanan:

- Refresh token plaintext tidak boleh disimpan di database.
- `refresh_token_hash` harus dibuat dari refresh token utuh menggunakan hash kuat atau HMAC server-side.
- `refresh_token_jti` dipakai untuk lookup cepat dan validasi token aktif.
- `previous_refresh_token_jti` dipakai untuk mendeteksi reuse token lama setelah refresh token rotation.
- Sesi yang kedaluwarsa dapat tetap disimpan sementara untuk audit dan deteksi anomali, lalu dibersihkan sesuai kebijakan retensi.

### 4.5 `officers`

Fungsi: menyimpan profil petugas lapangan, menghubungkan petugas dengan akun `users`, dan menentukan wilayah tugas utama.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key ke `users.id` |
| `officer_number` | `varchar(50)` | Nomor petugas unik |
| `full_name` | `varchar(150)` | Nama petugas |
| `phone_number` | `varchar(30)` | Nomor telepon operasional, nullable |
| `region_id` | `uuid` | Foreign key ke `regions.id` sebagai wilayah tugas utama |
| `status` | `varchar(20)` | `active`, `inactive`, `suspended` |
| `joined_date` | `date` | Tanggal mulai bertugas |
| `created_by` | `uuid` | Foreign key ke `users.id` |
| `updated_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |
| `deleted_at` | `timestamptz` | Soft delete |

Primary key:

- `id`

Foreign key:

- `user_id` ke `users.id`
- `region_id` ke `regions.id`
- `created_by` ke `users.id`
- `updated_by` ke `users.id`

Unique key:

- `user_id`
- `officer_number`

Index:

- `officers_user_id_uidx` pada `user_id`
- `officers_officer_number_uidx` pada `officer_number`
- `officers_region_status_idx` pada `region_id`, `status`
- `officers_active_idx` pada `id` dengan partial index `WHERE status = 'active' AND deleted_at IS NULL`

Catatan:

- Role Petugas tetap dikontrol melalui `user_roles`.
- Tabel ini menyimpan atribut operasional petugas lapangan yang tidak semestinya ditempatkan di `users`.
- Jika satu petugas perlu menangani banyak wilayah, desain dapat diperluas dengan tabel assignment khusus tanpa mengubah struktur pembayaran utama.

### 4.6 `regions`

Fungsi: menyimpan wilayah layanan secara hirarkis, misalnya kecamatan, kelurahan, RW, dan RT.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `parent_id` | `uuid` | Foreign key ke `regions.id`, nullable |
| `code` | `varchar(50)` | Kode wilayah unik |
| `name` | `varchar(150)` | Nama wilayah |
| `level` | `varchar(30)` | `kecamatan`, `kelurahan`, `rw`, `rt`, atau level lain |
| `status` | `varchar(20)` | `active`, `inactive` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `parent_id` ke `regions.id`

Unique key:

- `code`

Index:

- `regions_code_uidx` pada `code`
- `regions_parent_id_idx` pada `parent_id`
- `regions_level_idx` pada `level`
- `regions_status_idx` pada `status`

### 4.7 `customer_categories`

Fungsi: menyimpan kategori pelanggan untuk dasar tarif dan segmentasi laporan.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `code` | `varchar(50)` | Kode kategori |
| `name` | `varchar(100)` | Nama kategori |
| `description` | `text` | Deskripsi |
| `status` | `varchar(20)` | `active`, `inactive` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Unique key:

- `code`

Index:

- `customer_categories_code_uidx` pada `code`
- `customer_categories_status_idx` pada `status`

### 4.8 `customers`

Fungsi: menyimpan data warga atau pelanggan retribusi sampah.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `customer_number` | `varchar(50)` | Nomor pelanggan unik |
| `nik` | `varchar(30)` | Nomor identitas, nullable |
| `full_name` | `varchar(150)` | Nama warga |
| `phone_number` | `varchar(30)` | Nomor telepon, nullable |
| `region_id` | `uuid` | Foreign key ke `regions.id` sebagai wilayah layanan utama |
| `category_id` | `uuid` | Foreign key ke `customer_categories.id` |
| `status` | `varchar(20)` | `active`, `inactive`, `suspended` |
| `start_date` | `date` | Tanggal mulai berlangganan |
| `end_date` | `date` | Tanggal berhenti, nullable |
| `created_by` | `uuid` | Foreign key ke `users.id` |
| `updated_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |
| `deleted_at` | `timestamptz` | Soft delete |

Primary key:

- `id`

Foreign key:

- `region_id` ke `regions.id`
- `category_id` ke `customer_categories.id`
- `created_by` ke `users.id`
- `updated_by` ke `users.id`

Unique key:

- `customer_number`

Index:

- `customers_customer_number_uidx` pada `customer_number`
- `customers_nik_idx` pada `nik` dengan partial index `WHERE nik IS NOT NULL`
- `customers_full_name_idx` pada `full_name`
- `customers_region_status_idx` pada `region_id`, `status`
- `customers_category_idx` pada `category_id`
- `customers_active_idx` pada `id` dengan partial index `WHERE status = 'active' AND deleted_at IS NULL`
- `customers_search_trgm_idx` pada `full_name` menggunakan GIN trigram jika pencarian nama fuzzy dibutuhkan

Catatan:

- Detail alamat operasional seperti alamat lengkap, RT, RW, dan TPS disimpan di `customer_addresses`.
- `customers.region_id` tetap dipertahankan sebagai wilayah layanan utama untuk filter cepat, generate tagihan, dan dashboard.

### 4.9 `customer_addresses`

Fungsi: menyimpan alamat pelanggan secara lebih detail. Tabel ini bersifat opsional secara modul, tetapi direkomendasikan agar struktur wilayah, RT, RW, dan TPS tidak tercampur dengan data identitas pelanggan.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `customer_id` | `uuid` | Foreign key ke `customers.id` |
| `region_id` | `uuid` | Foreign key ke `regions.id` |
| `address_line` | `text` | Alamat lengkap atau deskripsi lokasi |
| `rt` | `varchar(10)` | RT |
| `rw` | `varchar(10)` | RW |
| `tps_code` | `varchar(50)` | Kode TPS, nullable |
| `tps_name` | `varchar(150)` | Nama TPS, nullable |
| `latitude` | `numeric(10,7)` | Latitude alamat, nullable |
| `longitude` | `numeric(10,7)` | Longitude alamat, nullable |
| `is_primary` | `boolean` | Penanda alamat utama |
| `status` | `varchar(20)` | `active`, `inactive` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `customer_id` ke `customers.id`
- `region_id` ke `regions.id`

Unique key:

- Satu alamat utama aktif per pelanggan menggunakan partial unique index pada `customer_id` dengan kondisi `WHERE is_primary = true AND status = 'active'`

Index:

- `customer_addresses_customer_id_idx` pada `customer_id`
- `customer_addresses_region_rt_rw_idx` pada `region_id`, `rw`, `rt`
- `customer_addresses_tps_code_idx` pada `tps_code` dengan partial index `WHERE tps_code IS NOT NULL`
- `customer_addresses_primary_idx` pada `customer_id`, `is_primary`
- `customer_addresses_status_idx` pada `status`

Catatan:

- Satu pelanggan dapat memiliki lebih dari satu alamat jika diperlukan, tetapi hanya satu alamat aktif yang sebaiknya ditandai `is_primary = true`.
- Untuk kebutuhan operasional awal, alamat utama digunakan sebagai dasar wilayah tagihan dan rute petugas.

### 4.10 `customer_user_accounts`

Fungsi: menghubungkan data pelanggan dengan akun login warga.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `customer_id` | `uuid` | Foreign key ke `customers.id` |
| `user_id` | `uuid` | Foreign key ke `users.id` |
| `is_primary` | `boolean` | Penanda akun utama warga |
| `created_at` | `timestamptz` | Waktu penghubungan akun |

Primary key:

- `customer_id`, `user_id`

Foreign key:

- `customer_id` ke `customers.id`
- `user_id` ke `users.id`

Index:

- `customer_user_accounts_customer_id_idx` pada `customer_id`
- `customer_user_accounts_user_id_idx` pada `user_id`
- `customer_user_accounts_primary_idx` pada `customer_id`, `is_primary`

### 4.11 `tariffs`

Fungsi: menyimpan tarif retribusi aktif dan historis berdasarkan kategori pelanggan dan opsional wilayah.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `code` | `varchar(50)` | Kode tarif |
| `name` | `varchar(150)` | Nama tarif |
| `category_id` | `uuid` | Foreign key ke `customer_categories.id` |
| `region_id` | `uuid` | Foreign key ke `regions.id`, nullable |
| `amount` | `numeric(14,2)` | Nominal tarif bulanan |
| `effective_start_date` | `date` | Tanggal mulai berlaku |
| `effective_end_date` | `date` | Tanggal akhir berlaku, nullable |
| `status` | `varchar(20)` | `active`, `inactive` |
| `created_by` | `uuid` | Foreign key ke `users.id` |
| `updated_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `category_id` ke `customer_categories.id`
- `region_id` ke `regions.id`
- `created_by` ke `users.id`
- `updated_by` ke `users.id`

Unique key:

- `code`

Index:

- `tariffs_code_uidx` pada `code`
- `tariffs_category_region_status_idx` pada `category_id`, `region_id`, `status`
- `tariffs_effective_date_idx` pada `effective_start_date`, `effective_end_date`
- `tariffs_active_lookup_idx` pada `category_id`, `region_id`, `effective_start_date` dengan partial index `WHERE status = 'active'`

### 4.12 `tariff_histories`

Fungsi: menyimpan snapshot perubahan tarif untuk audit dan penelusuran tarif yang pernah berlaku.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `tariff_id` | `uuid` | Foreign key ke `tariffs.id` |
| `old_amount` | `numeric(14,2)` | Nominal lama |
| `new_amount` | `numeric(14,2)` | Nominal baru |
| `old_effective_start_date` | `date` | Tanggal berlaku lama |
| `new_effective_start_date` | `date` | Tanggal berlaku baru |
| `reason` | `text` | Alasan perubahan |
| `changed_by` | `uuid` | Foreign key ke `users.id` |
| `changed_at` | `timestamptz` | Waktu perubahan |

Primary key:

- `id`

Foreign key:

- `tariff_id` ke `tariffs.id`
- `changed_by` ke `users.id`

Index:

- `tariff_histories_tariff_id_idx` pada `tariff_id`
- `tariff_histories_changed_at_idx` pada `changed_at`

### 4.13 `billing_periods`

Fungsi: menyimpan periode penagihan bulanan.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `year` | `smallint` | Tahun tagihan |
| `month` | `smallint` | Bulan tagihan, 1-12 |
| `period_code` | `varchar(7)` | Format `YYYY-MM` |
| `start_date` | `date` | Awal periode |
| `end_date` | `date` | Akhir periode |
| `status` | `varchar(20)` | `draft`, `open`, `closed` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Unique key:

- `period_code`
- `year`, `month`

Index:

- `billing_periods_period_code_uidx` pada `period_code`
- `billing_periods_year_month_uidx` pada `year`, `month`
- `billing_periods_status_idx` pada `status`

### 4.14 `bill_generation_batches`

Fungsi: mencatat proses generate tagihan massal agar proses dapat diaudit, dipantau, dan dijalankan bertahap.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `billing_period_id` | `uuid` | Foreign key ke `billing_periods.id` |
| `status` | `varchar(20)` | `pending`, `processing`, `completed`, `failed`, `cancelled` |
| `total_customers` | `integer` | Jumlah pelanggan target |
| `processed_customers` | `integer` | Jumlah pelanggan diproses |
| `generated_bills` | `integer` | Jumlah tagihan dibuat |
| `failed_count` | `integer` | Jumlah gagal |
| `started_at` | `timestamptz` | Waktu mulai |
| `finished_at` | `timestamptz` | Waktu selesai |
| `error_message` | `text` | Pesan error jika gagal |
| `created_by` | `uuid` | Foreign key ke `users.id` |
| `created_at` | `timestamptz` | Waktu pembuatan |

Primary key:

- `id`

Foreign key:

- `billing_period_id` ke `billing_periods.id`
- `created_by` ke `users.id`

Index:

- `bill_generation_batches_period_idx` pada `billing_period_id`
- `bill_generation_batches_status_idx` pada `status`
- `bill_generation_batches_created_at_idx` pada `created_at`

### 4.15 `bills`

Fungsi: menyimpan tagihan bulanan setiap pelanggan.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `bill_number` | `varchar(60)` | Nomor tagihan unik |
| `customer_id` | `uuid` | Foreign key ke `customers.id` |
| `billing_period_id` | `uuid` | Foreign key ke `billing_periods.id` |
| `tariff_id` | `uuid` | Foreign key ke `tariffs.id` |
| `region_id` | `uuid` | Snapshot wilayah saat tagihan dibuat |
| `category_id` | `uuid` | Snapshot kategori saat tagihan dibuat |
| `amount` | `numeric(14,2)` | Nominal tagihan |
| `paid_amount` | `numeric(14,2)` | Total yang sudah dibayar |
| `outstanding_amount` | `numeric(14,2)` | Sisa tagihan |
| `status` | `varchar(20)` | `unpaid`, `partial`, `paid`, `cancelled` |
| `due_date` | `date` | Tanggal jatuh tempo |
| `generated_batch_id` | `uuid` | Foreign key ke `bill_generation_batches.id`, nullable |
| `cancelled_at` | `timestamptz` | Waktu pembatalan, nullable |
| `cancelled_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `cancellation_reason` | `text` | Alasan pembatalan, nullable |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `customer_id` ke `customers.id`
- `billing_period_id` ke `billing_periods.id`
- `tariff_id` ke `tariffs.id`
- `region_id` ke `regions.id`
- `category_id` ke `customer_categories.id`
- `generated_batch_id` ke `bill_generation_batches.id`
- `cancelled_by` ke `users.id`

Unique key:

- `bill_number`
- `customer_id`, `billing_period_id`

Index:

- `bills_bill_number_uidx` pada `bill_number`
- `bills_customer_period_uidx` pada `customer_id`, `billing_period_id`
- `bills_period_status_idx` pada `billing_period_id`, `status`
- `bills_region_period_status_idx` pada `region_id`, `billing_period_id`, `status`
- `bills_customer_status_idx` pada `customer_id`, `status`
- `bills_due_date_idx` pada `due_date`
- `bills_unpaid_idx` pada `billing_period_id`, `region_id` dengan partial index `WHERE status IN ('unpaid', 'partial')`

### 4.16 `payment_methods`

Fungsi: menyimpan master metode pembayaran agar sistem dapat mendukung tunai, QRIS, transfer bank, virtual account, dan metode lain tanpa mengubah struktur transaksi.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `code` | `varchar(50)` | Kode metode pembayaran |
| `name` | `varchar(100)` | Nama metode pembayaran |
| `description` | `text` | Deskripsi, nullable |
| `requires_reference_number` | `boolean` | Menandai apakah butuh nomor referensi eksternal |
| `status` | `varchar(20)` | `active`, `inactive` |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Unique key:

- `code`

Index:

- `payment_methods_code_uidx` pada `code`
- `payment_methods_status_idx` pada `status`

Catatan data awal:

- `cash` untuk pembayaran tunai.
- `qris` untuk pembayaran QRIS.
- `bank_transfer` untuk transfer bank.
- `virtual_account` untuk virtual account.

### 4.17 `payments`

Fungsi: menyimpan transaksi pembayaran yang dicatat oleh petugas atau kanal lain.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `payment_number` | `varchar(60)` | Nomor pembayaran unik |
| `customer_id` | `uuid` | Foreign key ke `customers.id` |
| `officer_id` | `uuid` | Foreign key ke `officers.id`, nullable jika bukan pembayaran lapangan |
| `recorded_by` | `uuid` | Foreign key ke `users.id` yang mencatat transaksi |
| `payment_method_id` | `uuid` | Foreign key ke `payment_methods.id` |
| `external_reference_number` | `varchar(120)` | Nomor referensi QRIS, transfer, atau virtual account, nullable |
| `amount` | `numeric(14,2)` | Nominal dibayar |
| `payment_at` | `timestamptz` | Tanggal dan waktu pembayaran |
| `recorded_at` | `timestamptz` | Tanggal dan waktu pencatatan sistem |
| `latitude` | `numeric(10,7)` | Latitude lokasi pencatatan, nullable |
| `longitude` | `numeric(10,7)` | Longitude lokasi pencatatan, nullable |
| `notes` | `text` | Catatan opsional |
| `status` | `varchar(20)` | `valid`, `voided`, `pending_sync` |
| `idempotency_key` | `varchar(120)` | Kunci pencegah duplikasi submit, nullable |
| `voided_at` | `timestamptz` | Waktu pembatalan, nullable |
| `voided_by` | `uuid` | Foreign key ke `users.id`, nullable |
| `void_reason` | `text` | Alasan pembatalan, nullable |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `customer_id` ke `customers.id`
- `officer_id` ke `officers.id`
- `recorded_by` ke `users.id`
- `payment_method_id` ke `payment_methods.id`
- `voided_by` ke `users.id`

Unique key:

- `payment_number`
- `idempotency_key` jika tidak null
- `external_reference_number` jika tidak null dan metode pembayaran mensyaratkan referensi unik

Index:

- `payments_payment_number_uidx` pada `payment_number`
- `payments_customer_payment_at_idx` pada `customer_id`, `payment_at DESC`
- `payments_officer_payment_at_idx` pada `officer_id`, `payment_at DESC`
- `payments_recorded_by_payment_at_idx` pada `recorded_by`, `payment_at DESC`
- `payments_method_payment_at_idx` pada `payment_method_id`, `payment_at DESC`
- `payments_payment_at_idx` pada `payment_at DESC`
- `payments_status_idx` pada `status`
- `payments_idempotency_key_uidx` pada `idempotency_key` dengan partial index `WHERE idempotency_key IS NOT NULL`
- `payments_external_reference_uidx` pada `external_reference_number` dengan partial index `WHERE external_reference_number IS NOT NULL`

### 4.18 `payment_allocations`

Fungsi: mencatat alokasi pembayaran ke satu atau lebih tagihan. Tabel ini mendukung pembayaran sebagian, pembayaran beberapa periode sekaligus, dan audit pembayaran.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `payment_id` | `uuid` | Foreign key ke `payments.id` |
| `bill_id` | `uuid` | Foreign key ke `bills.id` |
| `allocated_amount` | `numeric(14,2)` | Nominal pembayaran yang dialokasikan ke tagihan |
| `created_at` | `timestamptz` | Waktu pembuatan |

Primary key:

- `id`

Foreign key:

- `payment_id` ke `payments.id`
- `bill_id` ke `bills.id`

Unique key:

- `payment_id`, `bill_id`

Index:

- `payment_allocations_payment_id_idx` pada `payment_id`
- `payment_allocations_bill_id_idx` pada `bill_id`

### 4.19 `payment_receipts`

Fungsi: menyimpan metadata bukti pembayaran digital.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `payment_id` | `uuid` | Foreign key ke `payments.id` |
| `receipt_number` | `varchar(60)` | Nomor bukti pembayaran |
| `file_url` | `text` | Lokasi file bukti jika dibuat sebagai file, nullable |
| `issued_at` | `timestamptz` | Waktu bukti diterbitkan |
| `created_at` | `timestamptz` | Waktu pembuatan |

Primary key:

- `id`

Foreign key:

- `payment_id` ke `payments.id`

Unique key:

- `payment_id`
- `receipt_number`

Index:

- `payment_receipts_payment_id_uidx` pada `payment_id`
- `payment_receipts_receipt_number_uidx` pada `receipt_number`

### 4.20 `dashboard_daily_summaries`

Fungsi: menyimpan agregasi harian untuk dashboard dan laporan cepat.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `summary_date` | `date` | Tanggal ringkasan |
| `region_id` | `uuid` | Foreign key ke `regions.id`, nullable untuk total global |
| `officer_id` | `uuid` | Foreign key ke `officers.id`, nullable untuk total semua petugas |
| `payment_method_id` | `uuid` | Foreign key ke `payment_methods.id`, nullable untuk total semua metode |
| `total_payment_amount` | `numeric(14,2)` | Total nominal pembayaran valid |
| `total_payment_count` | `integer` | Jumlah transaksi pembayaran valid |
| `created_at` | `timestamptz` | Waktu pembuatan |
| `updated_at` | `timestamptz` | Waktu perubahan terakhir |

Primary key:

- `id`

Foreign key:

- `region_id` ke `regions.id`
- `officer_id` ke `officers.id`
- `payment_method_id` ke `payment_methods.id`

Unique key:

- `summary_date`, `region_id`, `officer_id`, `payment_method_id`

Index:

- `dashboard_daily_summaries_date_idx` pada `summary_date DESC`
- `dashboard_daily_summaries_region_date_idx` pada `region_id`, `summary_date DESC`
- `dashboard_daily_summaries_officer_date_idx` pada `officer_id`, `summary_date DESC`
- `dashboard_daily_summaries_method_date_idx` pada `payment_method_id`, `summary_date DESC`

Catatan:

- Karena `region_id`, `officer_id`, dan `payment_method_id` dapat bernilai null untuk total agregat, implementasi unique constraint perlu memakai strategi yang konsisten, misalnya sentinel aggregate key, generated column, atau kombinasi partial unique index.

### 4.21 `dashboard_period_summaries`

Fungsi: menyimpan agregasi tagihan dan pembayaran per periode untuk dashboard kolektibilitas.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `billing_period_id` | `uuid` | Foreign key ke `billing_periods.id` |
| `region_id` | `uuid` | Foreign key ke `regions.id`, nullable untuk total global |
| `total_customers` | `integer` | Jumlah pelanggan pada periode |
| `total_bills` | `integer` | Jumlah tagihan |
| `total_bill_amount` | `numeric(14,2)` | Total nominal tagihan |
| `total_paid_amount` | `numeric(14,2)` | Total nominal dibayar |
| `total_outstanding_amount` | `numeric(14,2)` | Total tunggakan |
| `paid_bill_count` | `integer` | Jumlah tagihan lunas |
| `unpaid_bill_count` | `integer` | Jumlah tagihan belum bayar |
| `partial_bill_count` | `integer` | Jumlah tagihan dibayar sebagian |
| `collection_rate` | `numeric(7,4)` | Persentase kolektibilitas |
| `updated_at` | `timestamptz` | Waktu update ringkasan |

Primary key:

- `id`

Foreign key:

- `billing_period_id` ke `billing_periods.id`
- `region_id` ke `regions.id`

Unique key:

- `billing_period_id`, `region_id`

Index:

- `dashboard_period_summaries_period_idx` pada `billing_period_id`
- `dashboard_period_summaries_region_period_idx` pada `region_id`, `billing_period_id`
- `dashboard_period_summaries_collection_rate_idx` pada `collection_rate`

### 4.22 `audit_logs`

Fungsi: menyimpan jejak aktivitas penting pada data master, tagihan, pembayaran, akses, dan laporan.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `actor_user_id` | `uuid` | Foreign key ke `users.id`, nullable untuk proses sistem |
| `actor_role_code` | `varchar(30)` | Role saat aksi dilakukan |
| `action` | `varchar(80)` | Jenis aksi, misalnya `customer.create`, `payment.void` |
| `entity_table` | `varchar(80)` | Nama tabel target |
| `entity_id` | `uuid` | ID data target |
| `old_values` | `jsonb` | Nilai lama, nullable |
| `new_values` | `jsonb` | Nilai baru, nullable |
| `reason` | `text` | Alasan perubahan atau pembatalan |
| `ip_address` | `inet` | IP pengguna, nullable |
| `user_agent` | `text` | User agent, nullable |
| `request_id` | `uuid` | ID request untuk tracing, nullable |
| `created_at` | `timestamptz` | Waktu audit dibuat |

Primary key:

- `id`

Foreign key:

- `actor_user_id` ke `users.id`

Index:

- `audit_logs_actor_created_at_idx` pada `actor_user_id`, `created_at DESC`
- `audit_logs_entity_idx` pada `entity_table`, `entity_id`
- `audit_logs_action_created_at_idx` pada `action`, `created_at DESC`
- `audit_logs_created_at_idx` pada `created_at DESC`
- `audit_logs_old_values_gin_idx` pada `old_values` menggunakan GIN jika pencarian isi JSON diperlukan
- `audit_logs_new_values_gin_idx` pada `new_values` menggunakan GIN jika pencarian isi JSON diperlukan

### 4.23 `export_jobs`

Fungsi: menyimpan proses ekspor laporan besar agar tidak membebani request API sinkron.

| Kolom | Tipe PostgreSQL | Keterangan |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `requested_by` | `uuid` | Foreign key ke `users.id` |
| `report_type` | `varchar(50)` | Jenis laporan |
| `parameters` | `jsonb` | Filter laporan |
| `status` | `varchar(20)` | `pending`, `processing`, `completed`, `failed`, `expired` |
| `file_url` | `text` | Lokasi file hasil ekspor, nullable |
| `row_count` | `integer` | Jumlah baris hasil ekspor, nullable |
| `error_message` | `text` | Error jika gagal |
| `requested_at` | `timestamptz` | Waktu request |
| `started_at` | `timestamptz` | Waktu mulai proses |
| `finished_at` | `timestamptz` | Waktu selesai |
| `expires_at` | `timestamptz` | Waktu kedaluwarsa file |

Primary key:

- `id`

Foreign key:

- `requested_by` ke `users.id`

Index:

- `export_jobs_requested_by_idx` pada `requested_by`, `requested_at DESC`
- `export_jobs_status_idx` pada `status`
- `export_jobs_report_type_idx` pada `report_type`

## 5. Relasi Antar Tabel

Relasi utama:

- `users` memiliki banyak `user_roles`.
- `roles` memiliki banyak `user_roles`.
- `users` memiliki banyak `user_sessions` untuk sesi login dan refresh token aktif/historis.
- `users` dengan role Petugas memiliki satu profil operasional pada `officers`.
- `regions` memiliki banyak `officers` sebagai wilayah tugas utama petugas.
- `regions` memiliki relasi hirarkis ke dirinya sendiri melalui `parent_id`.
- `regions` memiliki banyak `customers`.
- `customers` memiliki banyak `customer_addresses`.
- `regions` memiliki banyak `customer_addresses` untuk detail RT, RW, dan TPS.
- `customer_categories` memiliki banyak `customers`.
- `customer_categories` memiliki banyak `tariffs`.
- `regions` dapat memiliki banyak `tariffs` jika tarif berbeda per wilayah.
- `customers` dapat memiliki akun warga melalui `customer_user_accounts`.
- `customers` memiliki banyak `bills`.
- `billing_periods` memiliki banyak `bills`.
- `tariffs` digunakan oleh banyak `bills`.
- `bill_generation_batches` menghasilkan banyak `bills`.
- `customers` memiliki banyak `payments`.
- `officers` mencatat banyak `payments` melalui `payments.officer_id`.
- `users` mencatat transaksi melalui `payments.recorded_by`.
- `payment_methods` digunakan oleh banyak `payments`.
- `payments` dialokasikan ke `bills` melalui `payment_allocations`.
- `payments` memiliki satu `payment_receipts`.
- `billing_periods` memiliki banyak `dashboard_period_summaries`.
- `regions` digunakan pada `dashboard_daily_summaries` dan `dashboard_period_summaries`.
- `officers` dan `payment_methods` digunakan pada `dashboard_daily_summaries`.
- `users` menghasilkan banyak `audit_logs` sebagai actor.
- `users` dapat membuat banyak `export_jobs`.

## 6. Strategi Index Utama

Index wajib untuk skenario query utama:

- Pencarian warga: `customers_customer_number_uidx`, `customers_full_name_idx`, `customers_search_trgm_idx`, `customers_region_status_idx`, `customer_addresses_region_rt_rw_idx`.
- Daftar tagihan warga: `bills_customer_status_idx`, `bills_customer_period_uidx`.
- Generate tagihan: `customers_active_idx`, `tariffs_active_lookup_idx`, `bills_customer_period_uidx`.
- Dashboard periode: `bills_period_status_idx`, `bills_region_period_status_idx`, `dashboard_period_summaries_region_period_idx`.
- Pembayaran lapangan: `payments_customer_payment_at_idx`, `payments_officer_payment_at_idx`, `payments_method_payment_at_idx`, `payment_allocations_bill_id_idx`.
- Laporan harian: `payments_payment_at_idx`, `payments_officer_payment_at_idx`, `dashboard_daily_summaries_region_date_idx`.
- Authentication/session: `user_sessions_refresh_token_jti_uidx`, `user_sessions_refresh_token_hash_uidx`, `user_sessions_user_status_idx`, `user_sessions_active_idx`.
- Audit: `audit_logs_entity_idx`, `audit_logs_actor_created_at_idx`, `audit_logs_action_created_at_idx`.

## 7. Strategi Optimasi untuk Minimal 100.000 Pelanggan

### 7.1 Data Master Warga

- Semua daftar warga harus menggunakan pagination.
- Pencarian nomor pelanggan harus menggunakan unique B-tree index.
- Pencarian nama dapat menggunakan trigram index jika kebutuhan pencarian tidak harus exact match.
- Filter wilayah dan status harus menggunakan index komposit `region_id`, `status`.
- Filter RT, RW, dan TPS menggunakan `customer_addresses` agar query operasional lapangan tidak bergantung pada pencarian teks bebas.
- Soft delete menggunakan `deleted_at`, dengan partial index untuk data aktif.

### 7.2 Generate Tagihan Bulanan

- Generate tagihan dijalankan dalam batch, bukan satu transaksi besar untuk seluruh pelanggan.
- Gunakan `bill_generation_batches` untuk melacak progress.
- Gunakan unique key `customer_id`, `billing_period_id` untuk mencegah duplikasi tagihan.
- Tagihan menyimpan snapshot `region_id`, `category_id`, dan `tariff_id` agar laporan historis tetap konsisten meskipun data master berubah.

### 7.3 Pembayaran

- Pencatatan pembayaran dan alokasi ke tagihan harus berjalan dalam satu database transaction.
- Kolom `paid_amount`, `outstanding_amount`, dan `status` pada `bills` diperbarui secara konsisten setelah insert `payment_allocations`.
- Metode pembayaran harus direferensikan melalui `payment_methods`, bukan string bebas, agar tunai, QRIS, transfer bank, dan virtual account dapat dikelola konsisten.
- Pembayaran lapangan direlasikan ke `officers`, sementara akun yang melakukan input tetap dicatat melalui `recorded_by`.
- `external_reference_number` digunakan untuk menyimpan referensi QRIS, transfer bank, atau virtual account.
- Gunakan `idempotency_key` untuk mencegah submit ganda dari PWA atau koneksi lapangan yang tidak stabil.
- Pembatalan pembayaran tidak menghapus data, tetapi mengubah `status` menjadi `voided` dan mencatat audit log.

### 7.4 Dashboard

- Dashboard tidak boleh selalu menghitung agregasi langsung dari seluruh tabel `bills` dan `payments`.
- Gunakan `dashboard_daily_summaries` untuk ringkasan pembayaran harian.
- Gunakan `dashboard_period_summaries` untuk kolektibilitas per periode dan wilayah.
- Ringkasan harian dapat difilter berdasarkan wilayah, petugas, dan metode pembayaran.
- Agregasi diperbarui saat pembayaran masuk, saat tagihan dibuat, atau melalui background reconciliation job.
- Untuk kebutuhan realtime, backend dapat membaca tabel summary lalu mengirim pembaruan melalui WebSocket atau Server-Sent Events.

### 7.5 Laporan Besar

- Laporan harian dapat membaca dari `payments` dengan index tanggal.
- Laporan bulanan dan tahunan sebaiknya membaca summary table jika hanya butuh agregasi.
- Laporan detail besar diproses lewat `export_jobs`.
- File ekspor disimpan di object storage atau storage internal, sedangkan database hanya menyimpan metadata.

### 7.6 Maintenance PostgreSQL

- Jalankan vacuum dan analyze secara rutin, terutama pada tabel transaksi besar.
- Monitor query lambat dengan `pg_stat_statements`.
- Pertimbangkan partitioning untuk `payments`, `audit_logs`, dan `bills` jika volume transaksi meningkat jauh di atas target awal.
- Gunakan connection pooling agar koneksi database stabil saat banyak petugas mengakses bersamaan.

### 7.7 Authentication dan User Sessions

- Refresh token wajib disimpan secara persisten di `user_sessions`.
- Database hanya menyimpan `refresh_token_hash`, bukan refresh token plaintext.
- Setiap login berhasil membuat satu row `user_sessions` dengan status `active`, `refresh_token_jti`, `refresh_token_hash`, `expires_at`, IP address, dan user agent.
- Setiap refresh token harus divalidasi terhadap `user_sessions`:
  - Token signature valid.
  - `refresh_token_jti` ditemukan.
  - `refresh_token_hash` cocok dengan hash token yang diterima.
  - Status sesi masih `active`.
  - `expires_at` belum lewat.
  - `user_id` pada token sama dengan `user_sessions.user_id`.
- `last_used_at` diperbarui setiap refresh token berhasil dipakai.
- Sesi expired dapat ditandai `expired` oleh background cleanup job.

#### Strategi Logout

- Logout mencabut sesi terkait refresh token yang dikirim client.
- Sistem harus mencocokkan refresh token dengan `user_sessions.refresh_token_jti` dan `refresh_token_hash`.
- Jika cocok, update:
  - `status = 'revoked'`
  - `revoked_at = now()`
  - `revoked_by = user_id` dari actor logout
  - `revocation_reason = 'user_logout'`
  - `updated_at = now()`
- Logout harus menolak refresh token yang bukan milik user yang sedang login.
- Logout dari semua perangkat dapat dilakukan dengan mengubah seluruh sesi aktif milik user menjadi `revoked`.
- Aksi logout dan logout semua perangkat wajib dicatat di `audit_logs`.

#### Strategi Refresh Token Rotation

- Setiap pemakaian refresh token yang valid harus menghasilkan refresh token baru.
- Rotation dilakukan dalam satu database transaction:
  - Lock row sesi aktif berdasarkan `refresh_token_jti`.
  - Validasi status, expiry, user, dan hash token.
  - Simpan `previous_refresh_token_jti` dengan nilai token lama.
  - Ganti `refresh_token_jti` dengan JTI token baru.
  - Ganti `refresh_token_hash` dengan hash token baru.
  - Perbarui `expires_at`, `last_used_at`, dan `updated_at`.
- Refresh token lama tidak boleh dapat digunakan lagi setelah rotation berhasil.
- Jika sistem menerima refresh token dengan JTI yang sama dengan `previous_refresh_token_jti`, anggap sebagai reuse token lama:
  - Cabut sesi terkait dengan `status = 'revoked'`.
  - Isi `revoked_at` dan `revocation_reason = 'refresh_token_reuse_detected'`.
  - Opsional: cabut semua sesi aktif milik user yang sama.
  - Catat audit log security event.
- Jika terjadi kegagalan di tengah rotation, transaction harus rollback agar sesi tidak berada dalam status ambigu.

## 8. Strategi Pagination untuk Data Besar

### 8.1 Prinsip Umum

- Hindari mengambil seluruh data tanpa limit.
- Setiap endpoint daftar wajib memiliki `limit`.
- Batasi `limit` maksimal, misalnya 100 baris per request.
- Gunakan urutan stabil dengan kolom unik, misalnya `created_at DESC, id DESC`.

### 8.2 Offset Pagination

Cocok untuk:

- Data master dengan volume sedang.
- Halaman admin yang membutuhkan nomor halaman.
- Filter yang tidak terlalu dalam.

Kelemahan:

- Lambat untuk halaman yang sangat jauh karena database tetap harus melewati banyak baris.
- Kurang ideal untuk tabel transaksi besar seperti `payments` dan `audit_logs`.

Contoh penggunaan konseptual:

- Daftar kategori pelanggan.
- Daftar tarif.
- Daftar wilayah.

### 8.3 Keyset Pagination

Cocok untuk:

- Daftar warga berskala besar.
- Daftar pembayaran.
- Daftar audit log.
- Riwayat tagihan dan pembayaran warga.

Strategi:

- Gunakan cursor berdasarkan `created_at` dan `id`, atau berdasarkan kolom bisnis seperti `payment_at` dan `id`.
- Query halaman berikutnya menggunakan kondisi setelah cursor terakhir.
- Pastikan kolom cursor memiliki index yang sesuai.

Index pendukung:

- `payments_payment_at_idx` untuk cursor pembayaran.
- `audit_logs_created_at_idx` untuk cursor audit.
- `customers_customer_number_uidx` untuk cursor daftar pelanggan berdasarkan nomor pelanggan.
- `bills_customer_period_uidx` untuk riwayat tagihan warga.

### 8.4 Pagination dengan Filter

Untuk filter besar:

- Filter wilayah menggunakan `region_id`.
- Filter status tagihan menggunakan `status`.
- Filter periode menggunakan `billing_period_id`.
- Filter tanggal pembayaran menggunakan range `payment_at`.
- Kombinasikan filter dengan index komposit yang sudah ditentukan.

## 9. Strategi Audit Log

### 9.1 Aktivitas yang Wajib Diaudit

- Login gagal berulang dan perubahan status akun.
- Login berhasil, logout, logout semua perangkat, refresh token rotation, dan deteksi refresh token reuse.
- Pembuatan, perubahan, dan penonaktifan data warga.
- Pembuatan dan perubahan alamat pelanggan.
- Pembuatan, perubahan, dan penonaktifan data petugas.
- Pembuatan dan perubahan tarif.
- Pembuatan dan perubahan metode pembayaran.
- Generate tagihan bulanan.
- Pembatalan tagihan.
- Pencatatan pembayaran.
- Pembatalan pembayaran.
- Ekspor laporan.
- Perubahan role user.

### 9.2 Isi Audit Log

Setiap audit log minimal menyimpan:

- Pengguna yang melakukan aksi.
- Role pengguna saat melakukan aksi.
- Nama aksi.
- Tabel dan ID data yang terdampak.
- Nilai lama dan nilai baru untuk perubahan data.
- Alasan untuk aksi koreksi atau pembatalan.
- IP address dan user agent jika tersedia.
- Waktu kejadian.

### 9.3 Pola Penyimpanan

- Audit log bersifat append-only.
- Audit log tidak boleh diubah oleh alur aplikasi normal.
- Perubahan sensitif harus mencatat `old_values` dan `new_values` dalam format `jsonb`.
- Data rahasia seperti password hash tidak boleh disimpan dalam `old_values` atau `new_values`.
- Untuk volume besar, `audit_logs` dapat dipartisi berdasarkan bulan dari `created_at`.

### 9.4 Retensi dan Akses

- Audit log transaksi keuangan sebaiknya disimpan minimal sesuai kebutuhan regulasi atau kebijakan organisasi.
- Akses audit log hanya untuk Admin yang berwenang.
- Query audit harus selalu menggunakan filter waktu, actor, action, atau entity agar tidak membaca seluruh tabel.

## 10. Catatan Constraint dan Integritas Data

- `customers.customer_number` harus unik dan tidak boleh digunakan ulang untuk pelanggan berbeda.
- `user_sessions.refresh_token_jti` harus unik.
- `user_sessions.refresh_token_hash` harus unik.
- `user_sessions.refresh_token_hash` tidak boleh berisi refresh token plaintext.
- `user_sessions.status` hanya boleh bernilai `active`, `revoked`, atau `expired`.
- `user_sessions.revoked_at` dan `revocation_reason` wajib diisi jika status `revoked`.
- `user_sessions.expires_at` harus lebih besar dari `created_at` saat sesi dibuat.
- `officers.officer_number` harus unik.
- `officers.user_id` harus unik agar satu akun petugas hanya memiliki satu profil petugas aktif.
- `payment_methods.code` harus unik dan dikelola sebagai master data.
- `bills.customer_id` dan `bills.billing_period_id` harus unik untuk mencegah tagihan ganda.
- `payments.payment_number` harus unik.
- `payments.idempotency_key` harus unik jika digunakan.
- `payments.external_reference_number` harus unik untuk metode pembayaran non-tunai jika referensi disediakan oleh kanal pembayaran.
- `payment_allocations.allocated_amount` tidak boleh melebihi sisa tagihan pada logika transaksi aplikasi.
- Total `payment_allocations` untuk satu `payment_id` harus sama dengan `payments.amount` untuk pembayaran valid.
- `bills.paid_amount` dan `bills.outstanding_amount` harus direkonsiliasi secara berkala dengan `payment_allocations`.
- Pembatalan pembayaran harus mengembalikan status dan nominal tagihan terdampak dalam satu transaksi database.

## 11. Rekomendasi Partitioning Masa Depan

Partitioning belum wajib untuk target awal 100.000 pelanggan, tetapi perlu disiapkan jika volume transaksi dan audit meningkat besar.

Kandidat partitioning:

- `payments` berdasarkan bulan `payment_at`.
- `audit_logs` berdasarkan bulan `created_at`.
- `user_sessions` berdasarkan bulan `created_at` jika volume login/refresh sangat tinggi.
- `bills` berdasarkan `billing_period_id` atau rentang tanggal periode jika jumlah tagihan historis sangat besar.

Pertimbangan:

- Partitioning menambah kompleksitas migration dan query.
- Terapkan setelah metrik produksi menunjukkan kebutuhan nyata.
- Pastikan strategi backup dan retention kompatibel dengan partitioning.

## 12. Catatan Implementasi

Desain ini menjadi acuan untuk pembuatan migration, model, API, dan query di tahap berikutnya. Implementasi final harus tetap divalidasi dengan kebutuhan laporan nyata, pola akses pengguna, dan hasil pengujian performa menggunakan dataset minimal 100.000 pelanggan.
