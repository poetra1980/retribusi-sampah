# IMPLEMENTATION LOG

## 2026-05-30

### Authentication Module

Status: Selesai

File:

- authRoutes.js
- authController.js
- authService.js
- authRepository.js
- authMiddleware.js
- authValidator.js

Endpoint:

POST /login
POST /logout
POST /refresh
GET /me
POST /change-password

Catatan:

- bcrypt digunakan untuk password
- JWT digunakan untuk authentication
- Refresh token sudah dirancang

## 2026-06-01

### Users Module

Status: Selesai

File:

- userRoutes.js
- userController.js
- userService.js
- userRepository.js
- userValidator.js
- authorizeRole.js (middleware baru untuk role-based authorization)

Endpoint:

- GET /users (list dengan pagination cursor, filter q/status/role)
- POST /users (create dengan validasi unique username/email/phone)
- GET /users/{id} (get by id dengan roles)
- PATCH /users/{id} (update partial dengan audit)
- POST /users/{id}/deactivate (nonaktifkan user dengan reason, proteksi last admin)
- POST /users/{id}/reset-password (reset password oleh admin)

Catatan:

- Semua endpoint Admin-only via middleware authorizeRole
- Unique constraint validation di service layer
- Audit log untuk create, update, deactivate, reset-password
- Proteksi deactivate sendiri jika satu-satunya admin aktif
- Cursor pagination untuk daftar user
- bcrypt untuk hashing password baru

### Roles Module

Status: Selesai

File:

- roleRoutes.js
- roleController.js
- roleService.js
- roleRepository.js
- roleValidator.js

Endpoint:

- GET /roles (list semua role)
- GET /roles/{id} (get role by id)
- PUT /users/{id}/roles (update roles user — di dalama userRoutes.js)

Catatan:

- Semua endpoint Admin-only
- Audit log untuk perubahan role user
- Role ID menggunakan smallint sesuai desain database

### Regions Module

Status: Selesai

File:

- regionRoutes.js
- regionController.js
- regionService.js
- regionRepository.js
- regionValidator.js

Endpoint:

- GET /regions (list dengan pagination cursor, filter q/parentId/level/status)
- GET /regions/tree (tree hirarkis)
- GET /regions/{id} (get by id)
- POST /regions (create — Admin)
- PATCH /regions/{id} (update — Admin, dengan deteksi cycle parent)
- POST /regions/{id}/deactivate (nonaktifkan — Admin, proteksi jika masih ada customer/officer/child aktif)

Catatan:

- GET endpoints tersedia untuk Admin dan Petugas
- POST/PATCH/DELETE hanya Admin via authorizeRole
- Cursor pagination berbasis code
- Audit log untuk create, update, deactivate
- Cycle detection untuk parent hirarki

### Customer Categories Module

Status: Selesai

File:

- customerCategoryRoutes.js
- customerCategoryController.js
- customerCategoryService.js
- customerCategoryRepository.js
- customerCategoryValidator.js

Endpoint:

- GET /customer-categories (list cursor pagination)
- GET /customer-categories/{id} (get by id)
- POST /customer-categories (create — Admin)
- PATCH /customer-categories/{id} (update — Admin)
- POST /customer-categories/{id}/deactivate (nonaktifkan — Admin, proteksi jika masih ada customer aktif)

Catatan:

- GET untuk Admin dan Petugas
- POST/PATCH/DELETE hanya Admin
- Cursor pagination berbasis code
- Audit log untuk semua perubahan
- Proteksi deactivate jika masih digunakan customer aktif

### Customers Module

Status: Selesai

File:

- customerRoutes.js
- customerController.js
- customerService.js
- customerRepository.js
- customerValidator.js

Endpoint:

- GET /customers (list dengan filter q, customerNumber, nik, regionId, categoryId, status, rt, rw, tpsCode — cursor pagination)
- POST /customers (create dengan optional address)
- GET /customers/{id} (get with addresses, userAccounts)
- PATCH /customers/{id} (update)
- POST /customers/{id}/deactivate (soft delete)
- POST /customers/{id}/link-user (link akun warga)
- POST /customers/{id}/unlink-user (unlink akun warga)
- GET /customers/{id}/bills (daftar tagihan warga)
- GET /customers/{id}/payments (daftar pembayaran warga)

Catatan:

- GET list untuk Admin dan Petugas
- GET by ID untuk Admin, Petugas, Warga (data sendiri)
- POST/PATCH/DELETE/link/unlink hanya Admin
- Customer number unique constraint
- Soft delete untuk deactivation
- Audit log untuk semua perubahan
- Cursor pagination untuk list, bills, payments
- Warga hanya bisa akses data yang terlink melalui customer_user_accounts

### Customer Addresses Module

Status: Selesai

File:

- addressRoutes.js
- addressController.js
- addressService.js
- addressRepository.js
- addressValidator.js

Endpoint:

- GET /customers/{customerId}/addresses (list — Admin, Petugas, Warga)
- POST /customers/{customerId}/addresses (create — Admin)
- GET /customer-addresses/{id} (get by id — Admin, Petugas, Warga)
- PATCH /customer-addresses/{id} (update — Admin)
- POST /customer-addresses/{id}/set-primary (set primary — Admin)
- POST /customer-addresses/{id}/deactivate (nonaktifkan — Admin, proteksi last active)

Catatan:

- Route nested di customerRoutes.js + addressRoutes.js terpisah
- Proteksi nonaktifkan alamat terakhir
- Audit log untuk semua perubahan

### Tariffs Module

Status: Selesai

File:

- tariffRoutes.js
- tariffController.js
- tariffService.js
- tariffRepository.js
- tariffValidator.js

Endpoint:

- GET /tariffs (list cursor pagination, filter q/categoryId/regionId/status/effectiveDate)
- POST /tariffs (create)
- GET /tariffs/{id} (get by id)
- PATCH /tariffs/{id} (update, reason wajib jika amount/effectiveDate berubah)
- POST /tariffs/{id}/deactivate (nonaktifkan)
- GET /tariffs/{id}/histories (riwayat perubahan amount/tanggal)

Catatan:

- Semua endpoint Admin-only
- Reason wajib untuk perubahan amount/effectiveDate
- Riwayat perubahan disimpan di tariff_histories
- Audit log untuk semua perubahan

### Billing Periods Module

Status: Selesai

File:

- billingPeriodRoutes.js
- billingPeriodController.js
- billingPeriodService.js
- billingPeriodRepository.js
- billingPeriodValidator.js

Endpoint:

- GET /billing-periods (list, filter year/month/status — Admin, Petugas)
- GET /billing-periods/{id} (get by id — Admin, Petugas)
- POST /billing-periods (create — Admin)
- PATCH /billing-periods/{id} (update — Admin, closed period tidak bisa diupdate)
- POST /billing-periods/{id}/close (close — Admin, harus open dulu)
- POST /billing-periods/{id}/reopen (reopen — Admin, harus closed dulu)

Catatan:

- GET untuk Admin dan Petugas
- POST/PATCH/close/reopen hanya Admin
- Status transition: draft -> open -> closed, closed -> open (reopen)
- Audit log untuk semua perubahan

### Bills Module

Status: Selesai

File:

- billRoutes.js
- billController.js
- billService.js
- billRepository.js
- billValidator.js

Endpoint:

- GET /bills (list dengan filter q, customerId, billingPeriodId, regionId, categoryId, status, dueDate — Admin, Petugas)
- POST /bills/generate (generate tagihan massal via batch — Admin)
- GET /bills/generation-batches (daftar batch — Admin)
- GET /bills/generation-batches/{id} (detail batch — Admin)
- GET /bills/{id} (detail tagihan — Admin, Petugas, Warga)
- POST /bills/{id}/cancel (batalkan tagihan — Admin)
- GET /bills/{id}/payments (daftar pembayaran tagihan — Admin, Petugas, Warga)

Catatan:

- Generate tagihan berjalan dalam batch (500 customer per batch) sinkron
- Bill number format: BL-{customerNumber}-{batchId}
- Tidak bisa cancel tagihan yang sudah paid/cancelled
- Warga hanya bisa akses tagihan terlink
- Audit log untuk generate dan cancel

### Payments Module

Status: Selesai

File:

- paymentRoutes.js, paymentController.js, paymentService.js, paymentRepository.js
- paymentMethodRoutes.js, paymentMethodController.js, paymentMethodService.js, paymentMethodRepository.js
- paymentValidator.js (gabungan payment + payment method)

Endpoint Payments:

- GET /payments (list — Admin, Petugas data sendiri)
- POST /payments (create — Admin, Petugas, idempotency-key header wajib)
- GET /payments/{id} (get by id)
- POST /payments/{id}/void (void — Admin, dengan reversal alokasi)
- GET /payments/{id}/receipt (get receipt)
- GET /payments/{id}/allocations (get alokasi tagihan)

Endpoint Payment Methods:

- GET /payment-methods (all roles)
- GET /payment-methods/{id} (all roles)
- POST /payment-methods (Admin)
- PATCH /payment-methods/{id} (Admin)
- POST /payment-methods/{id}/deactivate (Admin)

Catatan:

- Payment menggunakan database transaction (withTransaction)
- Idempotency-Key untuk mencegah duplikasi submit
- Alokasi pembayaran diverifikasi total = amount, tidak melebihi outstanding
- Void payment membalikkan alokasi ke tagihan dalam satu transaksi
- Petugas hanya lihat pembayaran sendiri (kecuali Admin)
- Warga hanya lihat pembayaran terlink
- Receipt dibuat otomatis saat payment berhasil

### Dashboard Module

Status: Selesai

File:

- dashboardRoutes.js
- dashboardController.js
- dashboardService.js
- dashboardRepository.js
- dashboardValidator.js

Endpoint:

- GET /dashboard/overview (ringkasan tagihan & kolektibilitas — Admin)
- GET /dashboard/payments/daily (ringkasan pembayaran harian — Admin)
- GET /dashboard/payments/latest (pembayaran terbaru — Admin, Petugas)
- GET /dashboard/regions (ringkasan per wilayah — Admin)
- GET /dashboard/officers (kinerja petugas — Admin)

Catatan:

- Overview dan region membaca langsung dari bills
- Daily dan latest membaca dari payments
- Petugas hanya melihat data sendiri di latest payments
- Officer performance dengan cursor pagination

### Reports Module

Status: Selesai

File:

- reportRoutes.js
- reportController.js
- reportService.js
- reportRepository.js
- reportValidator.js

Endpoint:

- GET /reports/payments/daily (laporan pembayaran harian — Admin)
- GET /reports/payments/monthly (laporan pembayaran bulanan — Admin)
- GET /reports/payments/yearly (laporan pembayaran tahunan — Admin)
- GET /reports/arrears (daftar tunggakan per periode — Admin)
- GET /reports/collection-rate (kolektibilitas per periode — Admin)
- GET /reports/officer-performance (kinerja petugas dalam rentang tanggal — Admin)
- POST /reports/exports (buat job ekspor laporan — Admin)
- GET /reports/exports (daftar job ekspor — Admin)
- GET /reports/exports/:id (detail job ekspor — Admin)
- GET /reports/exports/:id/download (download hasil ekspor — Admin)

Catatan:

- Semua endpoint Admin-only
- Daily/monthly payments membaca dari payments dengan join ke customers, officers, payment_methods
- Yearly payments mengelompokkan per bulan dengan SUM
- Arrears membaca bills unpaid/partial dengan filter outstanding
- Collection rate menghitung agregasi langsung dari bills
- Officer performance mengelompokkan per petugas dalam rentang tanggal
- Export jobs menggunakan tabel export_jobs yang sudah didefinisikan di DATABASE_DESIGN.md
- Export job dibuat dengan status pending (async processing belum diimplementasikan)

### Audit Logs Module

Status: Selesai

File:

- auditLogRoutes.js
- auditLogController.js
- auditLogService.js
- auditLogRepository.js
- auditLogValidator.js

Endpoint:

- GET /audit-logs (daftar audit log dengan filter actorUser, action, entity, date range — Admin)
- GET /audit-logs/:id (detail audit log — Admin)
- GET /audit-logs/entity/:entityTable/:entityId (riwayat perubahan entitas tertentu — Admin)

Catatan:

- Semua endpoint Admin-only, read-only
- Date range default 30 hari terakhir jika tidak disediakan
- Cursor pagination berdasarkan created_at
- entityTable whitelist terbatas pada tabel yang diaudit
- Join dengan users untuk mendapatkan nama aktor