# API Specification: Digital Retribusi Sampah

## 1. Ringkasan

Dokumen ini mendefinisikan spesifikasi REST API untuk sistem Digital Retribusi Sampah berdasarkan `PROJECT_REQUIREMENTS.md` dan `DATABASE_DESIGN.md`.

Dokumen ini hanya berisi kontrak API. Dokumen ini bukan kode backend, bukan Express route, dan bukan SQL migration.

Base URL:

- `/api/v1`

Format data:

- Request body: `application/json`
- Response body: `application/json`
- Waktu: ISO 8601 dengan timezone, misalnya `2026-05-30T10:30:00+07:00`
- ID: UUID untuk entitas utama, kecuali role memakai integer kecil sesuai desain database
- Nominal uang: decimal string atau number dengan 2 digit desimal

Role otorisasi:

- `Admin`
- `Petugas`
- `Warga`

## 2. Standar Umum API

### 2.1 Header

| Header | Wajib | Keterangan |
| --- | --- | --- |
| `Authorization: Bearer <token>` | Ya, kecuali login dan refresh | JWT access token |
| `Content-Type: application/json` | Ya untuk request body | Format body JSON |
| `Idempotency-Key` | Wajib untuk create payment | Mencegah submit pembayaran ganda |
| `X-Request-Id` | Opsional | Tracing request dari client |

### 2.2 Response Sukses

Single resource:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid"
  }
}
```

List resource:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "limit": 50,
      "nextCursor": "string-or-null",
      "prevCursor": "string-or-null",
      "total": 1000
    },
    "requestId": "uuid"
  }
}
```

### 2.3 Response Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "field": "customerNumber",
        "message": "customerNumber is required"
      }
    ]
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

Kode status umum:

| Status | Keterangan |
| --- | --- |
| `200` | Request berhasil |
| `201` | Resource berhasil dibuat |
| `202` | Proses asinkron diterima |
| `204` | Request berhasil tanpa body |
| `400` | Request tidak valid |
| `401` | Tidak terautentikasi |
| `403` | Tidak memiliki hak akses |
| `404` | Resource tidak ditemukan |
| `409` | Konflik data unik atau status |
| `422` | Validasi bisnis gagal |
| `429` | Rate limit |
| `500` | Kesalahan server |

### 2.4 Pagination, Sorting, dan Filter

Parameter list standar:

| Parameter | Tipe | Keterangan |
| --- | --- | --- |
| `limit` | integer | Default 50, maksimal 100 |
| `cursor` | string | Cursor untuk keyset pagination |
| `page` | integer | Opsional untuk data master kecil |
| `sort` | string | Contoh: `createdAt:desc`, `customerNumber:asc` |
| `q` | string | Kata kunci pencarian |

Aturan:

- Endpoint transaksi besar seperti bills, payments, dan audit logs harus mendukung cursor pagination.
- Endpoint master dapat mendukung offset pagination jika volume kecil.
- Filter tanggal memakai `dateFrom` dan `dateTo`.
- Filter wilayah memakai `regionId`.

## 3. Resource Ringkas

### 3.1 User

Field utama: `id`, `username`, `email`, `phoneNumber`, `fullName`, `status`, `roles`, `lastLoginAt`, `createdAt`, `updatedAt`.

### 3.2 Officer

Field utama: `id`, `userId`, `officerNumber`, `fullName`, `phoneNumber`, `regionId`, `status`, `joinedDate`, `createdAt`, `updatedAt`.

### 3.3 Region

Field utama: `id`, `parentId`, `code`, `name`, `level`, `status`, `createdAt`, `updatedAt`.

### 3.4 Customer

Field utama: `id`, `customerNumber`, `nik`, `fullName`, `phoneNumber`, `regionId`, `categoryId`, `status`, `startDate`, `endDate`, `createdAt`, `updatedAt`.

### 3.5 Customer Address

Field utama: `id`, `customerId`, `regionId`, `addressLine`, `rt`, `rw`, `tpsCode`, `tpsName`, `latitude`, `longitude`, `isPrimary`, `status`.

### 3.6 Tariff

Field utama: `id`, `code`, `name`, `categoryId`, `regionId`, `amount`, `effectiveStartDate`, `effectiveEndDate`, `status`.

### 3.7 Bill

Field utama: `id`, `billNumber`, `customerId`, `billingPeriodId`, `tariffId`, `regionId`, `categoryId`, `amount`, `paidAmount`, `outstandingAmount`, `status`, `dueDate`.

### 3.8 Payment

Field utama: `id`, `paymentNumber`, `customerId`, `officerId`, `recordedBy`, `paymentMethodId`, `externalReferenceNumber`, `amount`, `paymentAt`, `recordedAt`, `latitude`, `longitude`, `notes`, `status`.

## 4. Authentication

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/auth/login` | `POST` | Tidak ada | `username` atau `email`, `password` | `accessToken`, `refreshToken`, `expiresIn`, `user`, `roles` | Public | Username/email wajib; password wajib; akun harus `active`; audit login gagal |
| `/auth/refresh` | `POST` | Tidak ada | `refreshToken` | `accessToken`, `expiresIn` | Public dengan refresh token valid | Refresh token wajib, belum kedaluwarsa, dan belum dicabut |
| `/auth/logout` | `POST` | Tidak ada | `refreshToken` | `message` | Admin, Petugas, Warga | Token wajib; refresh token dicabut |
| `/auth/me` | `GET` | Tidak ada | Tidak ada | `user`, `roles`, `officer`, `customerAccounts` | Admin, Petugas, Warga | Token valid; user masih aktif |
| `/auth/change-password` | `POST` | Tidak ada | `currentPassword`, `newPassword`, `confirmPassword` | `message` | Admin, Petugas, Warga | Password lama benar; password baru minimal 8 karakter; konfirmasi sama; tidak sama dengan password lama |

## 5. Users

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/users` | `GET` | `q`, `status`, `role`, `limit`, `cursor`, `sort` | Tidak ada | List `User` | Admin | Filter valid; limit maksimal 100; sort hanya field yang diizinkan |
| `/users` | `POST` | Tidak ada | `username`, `email`, `phoneNumber`, `password`, `fullName`, `status`, `roleIds` | `User` | Admin | Username unik; email unik jika diisi; phone unik jika diisi; password kuat; roleIds valid |
| `/users/{id}` | `GET` | `id` path | Tidak ada | `User` | Admin | ID UUID valid; user harus ada |
| `/users/{id}` | `PATCH` | `id` path | `email`, `phoneNumber`, `fullName`, `status`, `roleIds` | `User` | Admin | Minimal satu field; email/phone unik; status valid; roleIds valid |
| `/users/{id}/deactivate` | `POST` | `id` path | `reason` | `User` | Admin | User harus aktif; reason wajib; tidak boleh menonaktifkan akun sendiri jika satu-satunya admin aktif |
| `/users/{id}/reset-password` | `POST` | `id` path | `newPassword`, `forceChangePassword` | `message` | Admin | Password kuat; user harus ada; audit wajib |

## 6. Roles

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/roles` | `GET` | Tidak ada | Tidak ada | List `Role` | Admin | Hanya role aktif atau seluruh role sesuai parameter implementasi |
| `/roles/{id}` | `GET` | `id` path | Tidak ada | `Role` | Admin | ID role valid; role harus ada |
| `/users/{id}/roles` | `PUT` | `id` path | `roleIds` | `User` dengan `roles` | Admin | User harus ada; semua roleIds valid; minimal satu role; audit perubahan role |

Catatan:

- Role dasar `Admin`, `Petugas`, dan `Warga` adalah master data sistem.
- Pembuatan role baru tidak menjadi kebutuhan utama tahap awal.

## 7. Officers

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/officers` | `GET` | `q`, `regionId`, `status`, `limit`, `cursor`, `sort` | Tidak ada | List `Officer` | Admin | regionId UUID valid; status valid; limit maksimal 100 |
| `/officers` | `POST` | Tidak ada | `userId`, `officerNumber`, `fullName`, `phoneNumber`, `regionId`, `status`, `joinedDate` | `Officer` | Admin | userId valid dan memiliki role Petugas; officerNumber unik; regionId valid; joinedDate valid |
| `/officers/{id}` | `GET` | `id` path | Tidak ada | `Officer` | Admin, Petugas pemilik data | ID UUID valid; Petugas hanya boleh melihat profil sendiri |
| `/officers/{id}` | `PATCH` | `id` path | `fullName`, `phoneNumber`, `regionId`, `status`, `joinedDate` | `Officer` | Admin | Minimal satu field; regionId valid; status valid |
| `/officers/{id}/deactivate` | `POST` | `id` path | `reason` | `Officer` | Admin | Officer harus aktif; reason wajib; audit wajib |
| `/officers/{id}/payments` | `GET` | `id` path, `dateFrom`, `dateTo`, `paymentMethodId`, `limit`, `cursor` | Tidak ada | List `Payment` | Admin, Petugas pemilik data | Date range valid; Petugas hanya data sendiri; limit maksimal 100 |

## 8. Regions

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/regions` | `GET` | `q`, `parentId`, `level`, `status`, `limit`, `cursor`, `sort` | Tidak ada | List `Region` | Admin, Petugas | level valid; parentId UUID valid jika ada |
| `/regions/tree` | `GET` | `status`, `level` | Tidak ada | Tree `Region` | Admin, Petugas | Filter valid; response dibatasi agar tidak terlalu besar |
| `/regions` | `POST` | Tidak ada | `parentId`, `code`, `name`, `level`, `status` | `Region` | Admin | code unik; parentId valid jika ada; level valid; parent tidak boleh membentuk siklus |
| `/regions/{id}` | `GET` | `id` path | Tidak ada | `Region` | Admin, Petugas | ID UUID valid |
| `/regions/{id}` | `PATCH` | `id` path | `parentId`, `code`, `name`, `level`, `status` | `Region` | Admin | code unik; parentId bukan dirinya sendiri; level valid |
| `/regions/{id}/deactivate` | `POST` | `id` path | `reason` | `Region` | Admin | Tidak boleh menonaktifkan wilayah yang masih memiliki customer/officer aktif kecuali dipindahkan |

## 9. Customer Categories

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/customer-categories` | `GET` | `q`, `status`, `limit`, `cursor`, `sort` | Tidak ada | List `CustomerCategory` | Admin, Petugas | status valid; limit maksimal 100 |
| `/customer-categories` | `POST` | Tidak ada | `code`, `name`, `description`, `status` | `CustomerCategory` | Admin | code unik; name wajib; status valid |
| `/customer-categories/{id}` | `GET` | `id` path | Tidak ada | `CustomerCategory` | Admin, Petugas | ID UUID valid |
| `/customer-categories/{id}` | `PATCH` | `id` path | `code`, `name`, `description`, `status` | `CustomerCategory` | Admin | Minimal satu field; code unik; status valid |
| `/customer-categories/{id}/deactivate` | `POST` | `id` path | `reason` | `CustomerCategory` | Admin | Tidak boleh dinonaktifkan jika masih digunakan customer aktif tanpa migrasi kategori |

## 10. Customers

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/customers` | `GET` | `q`, `customerNumber`, `nik`, `regionId`, `categoryId`, `status`, `rt`, `rw`, `tpsCode`, `limit`, `cursor`, `sort` | Tidak ada | List `Customer` | Admin, Petugas | limit maksimal 100; filter UUID valid; pencarian warga harus memakai pagination |
| `/customers` | `POST` | Tidak ada | `customerNumber`, `nik`, `fullName`, `phoneNumber`, `regionId`, `categoryId`, `status`, `startDate`, `address` object opsional | `Customer` | Admin | customerNumber unik; regionId dan categoryId valid; fullName wajib; startDate valid; jika address dikirim validasi alamat berlaku |
| `/customers/{id}` | `GET` | `id` path | Tidak ada | `Customer` dengan `addresses`, `category`, `region` | Admin, Petugas, Warga pemilik | ID UUID valid; Warga hanya data miliknya |
| `/customers/{id}` | `PATCH` | `id` path | `nik`, `fullName`, `phoneNumber`, `regionId`, `categoryId`, `status`, `startDate`, `endDate` | `Customer` | Admin | Minimal satu field; region/category valid; endDate >= startDate jika ada |
| `/customers/{id}/deactivate` | `POST` | `id` path | `reason`, `endDate` | `Customer` | Admin | Customer harus aktif; reason wajib; endDate valid; tagihan aktif tetap tersimpan |
| `/customers/{id}/bills` | `GET` | `id` path, `billingPeriodId`, `status`, `limit`, `cursor` | Tidak ada | List `Bill` | Admin, Petugas, Warga pemilik | Warga hanya tagihan sendiri; status valid |
| `/customers/{id}/payments` | `GET` | `id` path, `dateFrom`, `dateTo`, `paymentMethodId`, `limit`, `cursor` | Tidak ada | List `Payment` | Admin, Petugas, Warga pemilik | Warga hanya pembayaran sendiri; date range valid |
| `/customers/{id}/link-user` | `POST` | `id` path | `userId`, `isPrimary` | `Customer` dengan `userAccounts` | Admin | userId valid dan memiliki role Warga; tidak boleh duplikasi relasi |
| `/customers/{id}/unlink-user` | `POST` | `id` path | `userId`, `reason` | `Customer` dengan `userAccounts` | Admin | userId terhubung; reason wajib |

## 11. Customer Addresses

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/customers/{customerId}/addresses` | `GET` | `customerId` path, `status` | Tidak ada | List `CustomerAddress` | Admin, Petugas, Warga pemilik | customerId valid; Warga hanya alamat sendiri |
| `/customers/{customerId}/addresses` | `POST` | `customerId` path | `regionId`, `addressLine`, `rt`, `rw`, `tpsCode`, `tpsName`, `latitude`, `longitude`, `isPrimary`, `status` | `CustomerAddress` | Admin | customerId dan regionId valid; rt/rw wajib; jika isPrimary true alamat utama lama harus diturunkan |
| `/customer-addresses/{id}` | `GET` | `id` path | Tidak ada | `CustomerAddress` | Admin, Petugas, Warga pemilik | ID UUID valid; Warga hanya alamat sendiri |
| `/customer-addresses/{id}` | `PATCH` | `id` path | `regionId`, `addressLine`, `rt`, `rw`, `tpsCode`, `tpsName`, `latitude`, `longitude`, `isPrimary`, `status` | `CustomerAddress` | Admin | Minimal satu field; regionId valid; koordinat harus dalam rentang valid |
| `/customer-addresses/{id}/set-primary` | `POST` | `id` path | Tidak ada | `CustomerAddress` | Admin | Alamat harus aktif; hanya satu alamat utama aktif per customer |
| `/customer-addresses/{id}/deactivate` | `POST` | `id` path | `reason` | `CustomerAddress` | Admin | Tidak boleh menonaktifkan satu-satunya alamat aktif tanpa alamat pengganti; reason wajib |

## 12. Tariffs

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/tariffs` | `GET` | `q`, `categoryId`, `regionId`, `status`, `effectiveDate`, `limit`, `cursor`, `sort` | Tidak ada | List `Tariff` | Admin | UUID valid; effectiveDate valid; limit maksimal 100 |
| `/tariffs` | `POST` | Tidak ada | `code`, `name`, `categoryId`, `regionId`, `amount`, `effectiveStartDate`, `effectiveEndDate`, `status` | `Tariff` | Admin | code unik; categoryId valid; regionId valid jika ada; amount > 0; tanggal efektif valid |
| `/tariffs/{id}` | `GET` | `id` path | Tidak ada | `Tariff` | Admin | ID UUID valid |
| `/tariffs/{id}` | `PATCH` | `id` path | `name`, `categoryId`, `regionId`, `amount`, `effectiveStartDate`, `effectiveEndDate`, `status`, `reason` | `Tariff` | Admin | reason wajib untuk perubahan amount/tanggal; amount > 0; tanggal akhir >= tanggal mulai |
| `/tariffs/{id}/deactivate` | `POST` | `id` path | `reason`, `effectiveEndDate` | `Tariff` | Admin | reason wajib; effectiveEndDate valid; tidak memengaruhi tagihan historis |
| `/tariffs/{id}/histories` | `GET` | `id` path, `limit`, `cursor` | Tidak ada | List `TariffHistory` | Admin | ID valid; limit maksimal 100 |

## 13. Billing Periods

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/billing-periods` | `GET` | `year`, `month`, `status`, `limit`, `cursor`, `sort` | Tidak ada | List `BillingPeriod` | Admin, Petugas | year/month valid; status valid |
| `/billing-periods` | `POST` | Tidak ada | `year`, `month`, `startDate`, `endDate`, `status` | `BillingPeriod` | Admin | Kombinasi year+month unik; month 1-12; endDate >= startDate |
| `/billing-periods/{id}` | `GET` | `id` path | Tidak ada | `BillingPeriod` | Admin, Petugas | ID UUID valid |
| `/billing-periods/{id}` | `PATCH` | `id` path | `startDate`, `endDate`, `status` | `BillingPeriod` | Admin | Periode belum closed untuk perubahan tanggal; status transition valid |
| `/billing-periods/{id}/close` | `POST` | `id` path | `reason` | `BillingPeriod` | Admin | Periode harus open; reason wajib |
| `/billing-periods/{id}/reopen` | `POST` | `id` path | `reason` | `BillingPeriod` | Admin | Periode harus closed; reason wajib; audit wajib |

## 14. Bills

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/bills` | `GET` | `q`, `customerId`, `billingPeriodId`, `regionId`, `categoryId`, `status`, `dueDateFrom`, `dueDateTo`, `limit`, `cursor`, `sort` | Tidak ada | List `Bill` | Admin, Petugas | UUID valid; status valid; limit maksimal 100 |
| `/bills/generate` | `POST` | Tidak ada | `billingPeriodId`, `regionId` opsional, `categoryId` opsional, `dueDate` | `BillGenerationBatch` | Admin | billingPeriodId valid dan open/draft; dueDate valid; tidak membuat duplikasi customer+period |
| `/bills/generation-batches` | `GET` | `billingPeriodId`, `status`, `limit`, `cursor` | Tidak ada | List `BillGenerationBatch` | Admin | status valid; limit maksimal 100 |
| `/bills/generation-batches/{id}` | `GET` | `id` path | Tidak ada | `BillGenerationBatch` | Admin | ID UUID valid |
| `/bills/{id}` | `GET` | `id` path | Tidak ada | `Bill` dengan `customer`, `period`, `allocations` | Admin, Petugas, Warga pemilik | ID UUID valid; Warga hanya tagihan sendiri |
| `/bills/{id}/cancel` | `POST` | `id` path | `reason` | `Bill` | Admin | Bill belum lunas atau aturan koreksi terpenuhi; reason wajib; audit wajib |
| `/bills/{id}/payments` | `GET` | `id` path, `limit`, `cursor` | Tidak ada | List `PaymentAllocation` dengan `Payment` | Admin, Petugas, Warga pemilik | ID valid; Warga hanya tagihan sendiri |

## 15. Payments

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/payments` | `GET` | `q`, `customerId`, `officerId`, `paymentMethodId`, `status`, `dateFrom`, `dateTo`, `limit`, `cursor`, `sort` | Tidak ada | List `Payment` | Admin, Petugas | Petugas hanya pembayaran sendiri kecuali Admin; date range valid; limit maksimal 100 |
| `/payments` | `POST` | Header `Idempotency-Key` | `customerId`, `officerId`, `paymentMethodId`, `externalReferenceNumber`, `amount`, `paymentAt`, `latitude`, `longitude`, `notes`, `allocations[{billId, allocatedAmount}]` | `Payment` dengan `receipt` dan `allocations` | Admin, Petugas | Idempotency-Key wajib; customerId valid; officerId wajib untuk Petugas; paymentMethodId aktif; amount > 0; total allocation = amount; bill milik customer; tidak melebihi outstanding |
| `/payments/{id}` | `GET` | `id` path | Tidak ada | `Payment` dengan `customer`, `officer`, `method`, `receipt`, `allocations` | Admin, Petugas, Warga pemilik | ID UUID valid; Warga hanya pembayaran sendiri; Petugas hanya pembayaran yang dicatat sendiri kecuali Admin |
| `/payments/{id}/void` | `POST` | `id` path | `reason` | `Payment` | Admin | Payment harus valid; reason wajib; reversal alokasi harus dalam satu transaksi; audit wajib |
| `/payments/{id}/receipt` | `GET` | `id` path | Tidak ada | `PaymentReceipt` | Admin, Petugas, Warga pemilik | ID valid; akses mengikuti akses pembayaran |
| `/payments/{id}/allocations` | `GET` | `id` path | Tidak ada | List `PaymentAllocation` | Admin, Petugas, Warga pemilik | ID valid; akses mengikuti akses pembayaran |

## 16. Payment Methods

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/payment-methods` | `GET` | `status`, `limit`, `cursor`, `sort` | Tidak ada | List `PaymentMethod` | Admin, Petugas, Warga | status valid |
| `/payment-methods` | `POST` | Tidak ada | `code`, `name`, `description`, `requiresReferenceNumber`, `status` | `PaymentMethod` | Admin | code unik; name wajib; status valid |
| `/payment-methods/{id}` | `GET` | `id` path | Tidak ada | `PaymentMethod` | Admin, Petugas, Warga | ID UUID valid |
| `/payment-methods/{id}` | `PATCH` | `id` path | `name`, `description`, `requiresReferenceNumber`, `status` | `PaymentMethod` | Admin | Minimal satu field; tidak boleh mengubah code sistem tanpa prosedur migrasi |
| `/payment-methods/{id}/deactivate` | `POST` | `id` path | `reason` | `PaymentMethod` | Admin | reason wajib; tidak mengubah pembayaran historis |

Catatan data awal:

- `cash`
- `qris`
- `bank_transfer`
- `virtual_account`

## 17. Dashboard

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard/overview` | `GET` | `billingPeriodId`, `regionId` | Tidak ada | `totalBills`, `totalBillAmount`, `totalPaidAmount`, `totalOutstandingAmount`, `paidBillCount`, `unpaidBillCount`, `partialBillCount`, `collectionRate` | Admin | billingPeriodId valid; regionId valid jika ada |
| `/dashboard/payments/daily` | `GET` | `dateFrom`, `dateTo`, `regionId`, `officerId`, `paymentMethodId` | Tidak ada | List daily summary | Admin | Date range wajib dan maksimal sesuai kebijakan, misalnya 366 hari |
| `/dashboard/payments/latest` | `GET` | `regionId`, `officerId`, `limit` | Tidak ada | List pembayaran terbaru | Admin, Petugas | limit maksimal 50; Petugas hanya data sendiri |
| `/dashboard/regions` | `GET` | `billingPeriodId`, `parentRegionId` | Tidak ada | List summary per region | Admin | billingPeriodId valid; parentRegionId valid jika ada |
| `/dashboard/officers` | `GET` | `dateFrom`, `dateTo`, `regionId`, `limit`, `cursor` | Tidak ada | List summary kinerja petugas | Admin | Date range valid; limit maksimal 100 |

Catatan:

- Endpoint dashboard membaca summary table jika tersedia.
- Data dashboard dapat diperbarui mendekati realtime melalui mekanisme backend terpisah, tetapi kontrak REST ini tetap menjadi sumber snapshot.

## 18. Reports

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/reports/payments/daily` | `GET` | `date`, `regionId`, `officerId`, `paymentMethodId`, `limit`, `cursor` | Tidak ada | Detail dan summary pembayaran harian | Admin | date wajib; filter UUID valid |
| `/reports/payments/monthly` | `GET` | `year`, `month`, `regionId`, `officerId`, `paymentMethodId`, `limit`, `cursor` | Tidak ada | Detail dan summary pembayaran bulanan | Admin | year/month valid |
| `/reports/payments/yearly` | `GET` | `year`, `regionId`, `paymentMethodId`, `limit`, `cursor` | Tidak ada | Summary pembayaran tahunan | Admin | year valid |
| `/reports/arrears` | `GET` | `billingPeriodId`, `regionId`, `categoryId`, `minOutstandingAmount`, `limit`, `cursor` | Tidak ada | List tunggakan | Admin | billingPeriodId valid; minOutstandingAmount >= 0 |
| `/reports/collection-rate` | `GET` | `billingPeriodId`, `regionId` | Tidak ada | Summary kolektibilitas | Admin | billingPeriodId valid |
| `/reports/officer-performance` | `GET` | `dateFrom`, `dateTo`, `regionId`, `officerId`, `limit`, `cursor` | Tidak ada | Summary kinerja petugas | Admin | Date range valid; limit maksimal 100 |
| `/reports/exports` | `POST` | Tidak ada | `reportType`, `format`, `parameters` | `ExportJob` | Admin | reportType valid; format `csv` atau `xlsx`; parameters sesuai reportType; audit wajib |
| `/reports/exports` | `GET` | `status`, `reportType`, `limit`, `cursor` | Tidak ada | List `ExportJob` | Admin | status dan reportType valid |
| `/reports/exports/{id}` | `GET` | `id` path | Tidak ada | `ExportJob` | Admin | ID UUID valid; job harus milik requestor atau Admin |
| `/reports/exports/{id}/download` | `GET` | `id` path | Tidak ada | `downloadUrl` atau file stream | Admin | Job harus completed; file belum expired; audit akses laporan |

## 19. Audit Logs

| Endpoint | Method | Request Parameters | Request Body | Response Body | Authorization Role | Validation Rules |
| --- | --- | --- | --- | --- | --- | --- |
| `/audit-logs` | `GET` | `actorUserId`, `actorRoleCode`, `action`, `entityTable`, `entityId`, `dateFrom`, `dateTo`, `limit`, `cursor`, `sort` | Tidak ada | List `AuditLog` | Admin | Date range wajib untuk query besar; limit maksimal 100; UUID valid |
| `/audit-logs/{id}` | `GET` | `id` path | Tidak ada | `AuditLog` | Admin | ID UUID valid |
| `/audit-logs/entity/{entityTable}/{entityId}` | `GET` | `entityTable`, `entityId`, `limit`, `cursor` | Tidak ada | List `AuditLog` untuk entity | Admin | entityTable harus whitelist; entityId UUID valid; limit maksimal 100 |

Aturan audit:

- Audit log bersifat read-only dari sisi API aplikasi.
- Tidak ada endpoint create, update, atau delete audit log untuk client umum.
- Data sensitif seperti password hash tidak boleh pernah muncul di `oldValues` atau `newValues`.

## 20. Aturan Validasi Lintas Modul

### 20.1 UUID dan Referensi

- Semua path parameter ID harus UUID valid, kecuali `roles.id`.
- Foreign key yang dikirim client harus merujuk data aktif, kecuali endpoint historis secara eksplisit mengizinkan data nonaktif.
- Response `404` dipakai untuk ID yang tidak ditemukan.

### 20.2 Status

Status yang digunakan:

- User: `active`, `inactive`, `locked`
- Officer: `active`, `inactive`, `suspended`
- Region: `active`, `inactive`
- Customer: `active`, `inactive`, `suspended`
- Tariff: `active`, `inactive`
- Billing Period: `draft`, `open`, `closed`
- Bill: `unpaid`, `partial`, `paid`, `cancelled`
- Payment: `valid`, `voided`, `pending_sync`
- Export Job: `pending`, `processing`, `completed`, `failed`, `expired`

### 20.3 Nominal

- Nominal uang harus lebih besar dari 0 untuk pembayaran dan tarif.
- Nominal menggunakan maksimal 2 digit desimal.
- Total `allocations.allocatedAmount` pada pembayaran harus sama dengan `payments.amount`.
- Alokasi tidak boleh melebihi `outstandingAmount` tagihan.

### 20.4 Tanggal

- `dateTo` harus lebih besar atau sama dengan `dateFrom`.
- `effectiveEndDate` harus lebih besar atau sama dengan `effectiveStartDate`.
- `endDate` pelanggan harus lebih besar atau sama dengan `startDate`.
- `paymentAt` tidak boleh jauh di masa depan melebihi toleransi kebijakan sistem.

### 20.5 Otorisasi Warga

- Warga hanya boleh mengakses data customer yang terhubung melalui `customer_user_accounts`.
- Warga hanya boleh melihat tagihan, pembayaran, alamat, dan bukti pembayaran miliknya sendiri.
- Warga tidak boleh membuat atau mengubah data master, tagihan, atau pembayaran.

### 20.6 Otorisasi Petugas

- Petugas dapat mencari warga dan melihat tagihan untuk kebutuhan lapangan.
- Petugas dapat mencatat pembayaran.
- Petugas hanya boleh melihat riwayat pembayaran yang dicatat sendiri, kecuali kebijakan operasional memberikan cakupan wilayah lebih luas.

### 20.7 Otorisasi Admin

- Admin dapat mengelola seluruh data master.
- Admin dapat generate dan membatalkan tagihan.
- Admin dapat membatalkan pembayaran dengan alasan.
- Admin dapat mengakses dashboard, laporan, export job, dan audit log.

## 21. Catatan Implementasi API

- Endpoint create, update, deactivate, cancel, void, dan export wajib membuat audit log.
- Endpoint list wajib menerapkan pagination.
- Endpoint list untuk data besar sebaiknya memakai keyset pagination.
- Endpoint create payment wajib idempotent menggunakan header `Idempotency-Key`.
- Endpoint generate bills dan export reports bersifat asinkron dan mengembalikan status job.
- API tidak boleh mengirim `passwordHash` dalam response apa pun.
