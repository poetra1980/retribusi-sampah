-- Migration: 001_create_tables.sql
-- Creates all 23 tables for Digital Retribusi Sampah

-- ============================================================
-- 1. roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id         SMALLSERIAL PRIMARY KEY,
  code       VARCHAR(30)  NOT NULL,
  name       VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_code_uidx ON roles (code);

-- ============================================================
-- 2. regions (self-referencing via parent_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS regions (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id  UUID         REFERENCES regions (id),
  code       VARCHAR(50)  NOT NULL,
  name       VARCHAR(150) NOT NULL,
  level      VARCHAR(30)  NOT NULL,
  status     VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS regions_code_uidx        ON regions (code);
CREATE INDEX IF NOT EXISTS regions_parent_id_idx            ON regions (parent_id);
CREATE INDEX IF NOT EXISTS regions_level_idx                ON regions (level);
CREATE INDEX IF NOT EXISTS regions_status_idx               ON regions (status);

-- ============================================================
-- 3. users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(80)  NOT NULL,
  email         VARCHAR(255),
  phone_number  VARCHAR(30),
  password_hash TEXT         NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_uidx      ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx          ON users (email)  WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_uidx          ON users (phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_status_idx                 ON users (status);

-- ============================================================
-- 4. user_roles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    UUID        NOT NULL REFERENCES users (id),
  role_id    SMALLINT    NOT NULL REFERENCES roles (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON user_roles (role_id);

-- ============================================================
-- 5. user_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID         NOT NULL REFERENCES users (id),
  refresh_token_hash        TEXT         NOT NULL,
  refresh_token_jti         UUID         NOT NULL,
  previous_refresh_token_jti UUID,
  status                    VARCHAR(20)  NOT NULL DEFAULT 'active',
  ip_address                INET,
  user_agent                TEXT,
  device_name               VARCHAR(150),
  last_used_at              TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ  NOT NULL,
  revoked_at                TIMESTAMPTZ,
  revoked_by                UUID         REFERENCES users (id),
  revocation_reason         TEXT,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_refresh_token_jti_uidx   ON user_sessions (refresh_token_jti);
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_refresh_token_hash_uidx  ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_user_status_idx                 ON user_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS user_sessions_previous_jti_idx                ON user_sessions (previous_refresh_token_jti) WHERE previous_refresh_token_jti IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx                  ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_active_idx                      ON user_sessions (user_id, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS user_sessions_last_used_at_idx                ON user_sessions (last_used_at DESC);

-- ============================================================
-- 6. officers
-- ============================================================
CREATE TABLE IF NOT EXISTS officers (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL,
  officer_number VARCHAR(50) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  phone_number  VARCHAR(30),
  region_id     UUID         NOT NULL REFERENCES regions (id),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  joined_date   DATE         NOT NULL,
  created_by    UUID         NOT NULL REFERENCES users (id),
  updated_by    UUID         REFERENCES users (id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS officers_user_id_uidx           ON officers (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS officers_officer_number_uidx    ON officers (officer_number);
CREATE INDEX IF NOT EXISTS officers_region_status_idx             ON officers (region_id, status);
CREATE INDEX IF NOT EXISTS officers_active_idx                    ON officers (id) WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================
-- 7. customer_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_categories_code_uidx ON customer_categories (code);
CREATE INDEX IF NOT EXISTS customer_categories_status_idx       ON customer_categories (status);

-- ============================================================
-- 8. customers
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number VARCHAR(50)  NOT NULL,
  nik             VARCHAR(30),
  full_name       VARCHAR(150) NOT NULL,
  phone_number    VARCHAR(30),
  region_id       UUID         NOT NULL REFERENCES regions (id),
  category_id     UUID         NOT NULL REFERENCES customer_categories (id),
  status          VARCHAR(20)  NOT NULL DEFAULT 'active',
  start_date      DATE         NOT NULL,
  end_date        DATE,
  created_by      UUID         NOT NULL REFERENCES users (id),
  updated_by      UUID         REFERENCES users (id),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_customer_number_uidx ON customers (customer_number);
CREATE INDEX IF NOT EXISTS customers_nik_idx                     ON customers (nik) WHERE nik IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_full_name_idx               ON customers (full_name);
CREATE INDEX IF NOT EXISTS customers_region_status_idx           ON customers (region_id, status);
CREATE INDEX IF NOT EXISTS customers_category_idx                ON customers (category_id);
CREATE INDEX IF NOT EXISTS customers_active_idx                  ON customers (id) WHERE status = 'active' AND deleted_at IS NULL;

-- ============================================================
-- 9. customer_addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID          NOT NULL REFERENCES customers (id),
  region_id   UUID          NOT NULL REFERENCES regions (id),
  address_line TEXT,
  rt          VARCHAR(10),
  rw          VARCHAR(10),
  tps_code    VARCHAR(50),
  tps_name    VARCHAR(150),
  latitude    NUMERIC(10,7),
  longitude   NUMERIC(10,7),
  is_primary  BOOLEAN       NOT NULL DEFAULT false,
  status      VARCHAR(20)   NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_primary_uidx ON customer_addresses (customer_id) WHERE is_primary = true AND status = 'active';
CREATE INDEX IF NOT EXISTS customer_addresses_customer_id_idx     ON customer_addresses (customer_id);
CREATE INDEX IF NOT EXISTS customer_addresses_region_rt_rw_idx    ON customer_addresses (region_id, rw, rt);
CREATE INDEX IF NOT EXISTS customer_addresses_tps_code_idx        ON customer_addresses (tps_code) WHERE tps_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_addresses_primary_idx         ON customer_addresses (customer_id, is_primary);
CREATE INDEX IF NOT EXISTS customer_addresses_status_idx          ON customer_addresses (status);

-- ============================================================
-- 10. customer_user_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_user_accounts (
  customer_id UUID         NOT NULL REFERENCES customers (id),
  user_id     UUID         NOT NULL REFERENCES users (id),
  is_primary  BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, user_id)
);

CREATE INDEX IF NOT EXISTS customer_user_accounts_customer_id_idx ON customer_user_accounts (customer_id);
CREATE INDEX IF NOT EXISTS customer_user_accounts_user_id_idx     ON customer_user_accounts (user_id);
CREATE INDEX IF NOT EXISTS customer_user_accounts_primary_idx     ON customer_user_accounts (customer_id, is_primary);

-- ============================================================
-- 11. tariffs
-- ============================================================
CREATE TABLE IF NOT EXISTS tariffs (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50)  NOT NULL,
  name                VARCHAR(150) NOT NULL,
  category_id         UUID         NOT NULL REFERENCES customer_categories (id),
  region_id           UUID         REFERENCES regions (id),
  amount              NUMERIC(14,2) NOT NULL,
  effective_start_date DATE        NOT NULL,
  effective_end_date  DATE,
  status              VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_by          UUID         NOT NULL REFERENCES users (id),
  updated_by          UUID         REFERENCES users (id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tariffs_code_uidx                ON tariffs (code);
CREATE INDEX IF NOT EXISTS tariffs_category_region_status_idx      ON tariffs (category_id, region_id, status);
CREATE INDEX IF NOT EXISTS tariffs_effective_date_idx              ON tariffs (effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS tariffs_active_lookup_idx               ON tariffs (category_id, region_id, effective_start_date) WHERE status = 'active';

-- ============================================================
-- 12. tariff_histories
-- ============================================================
CREATE TABLE IF NOT EXISTS tariff_histories (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id              UUID         NOT NULL REFERENCES tariffs (id),
  old_amount             NUMERIC(14,2),
  new_amount             NUMERIC(14,2) NOT NULL,
  old_effective_start_date DATE,
  new_effective_start_date DATE        NOT NULL,
  reason                 TEXT,
  changed_by             UUID         NOT NULL REFERENCES users (id),
  changed_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tariff_histories_tariff_id_idx   ON tariff_histories (tariff_id);
CREATE INDEX IF NOT EXISTS tariff_histories_changed_at_idx  ON tariff_histories (changed_at);

-- ============================================================
-- 13. billing_periods
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_periods (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  year        SMALLINT     NOT NULL,
  month       SMALLINT     NOT NULL CHECK (month >= 1 AND month <= 12),
  period_code VARCHAR(7)   NOT NULL,
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_periods_period_code_uidx  ON billing_periods (period_code);
CREATE UNIQUE INDEX IF NOT EXISTS billing_periods_year_month_uidx   ON billing_periods (year, month);
CREATE INDEX IF NOT EXISTS billing_periods_status_idx               ON billing_periods (status);

-- ============================================================
-- 14. bill_generation_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_generation_batches (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_period_id   UUID         NOT NULL REFERENCES billing_periods (id),
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
  total_customers     INTEGER      NOT NULL DEFAULT 0,
  processed_customers INTEGER      NOT NULL DEFAULT 0,
  generated_bills     INTEGER      NOT NULL DEFAULT 0,
  failed_count        INTEGER      NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ,
  finished_at         TIMESTAMPTZ,
  error_message       TEXT,
  created_by          UUID         NOT NULL REFERENCES users (id),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bill_generation_batches_period_idx     ON bill_generation_batches (billing_period_id);
CREATE INDEX IF NOT EXISTS bill_generation_batches_status_idx     ON bill_generation_batches (status);
CREATE INDEX IF NOT EXISTS bill_generation_batches_created_at_idx ON bill_generation_batches (created_at);

-- ============================================================
-- 15. bills
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number       VARCHAR(60)   NOT NULL,
  customer_id       UUID          NOT NULL REFERENCES customers (id),
  billing_period_id UUID          NOT NULL REFERENCES billing_periods (id),
  tariff_id         UUID          NOT NULL REFERENCES tariffs (id),
  region_id         UUID          NOT NULL REFERENCES regions (id),
  category_id       UUID          NOT NULL REFERENCES customer_categories (id),
  amount            NUMERIC(14,2) NOT NULL,
  paid_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20)   NOT NULL DEFAULT 'unpaid',
  due_date          DATE          NOT NULL,
  generated_batch_id UUID         REFERENCES bill_generation_batches (id),
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID          REFERENCES users (id),
  cancellation_reason TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bills_bill_number_uidx            ON bills (bill_number);
CREATE UNIQUE INDEX IF NOT EXISTS bills_customer_period_uidx        ON bills (customer_id, billing_period_id);
CREATE INDEX IF NOT EXISTS bills_period_status_idx                  ON bills (billing_period_id, status);
CREATE INDEX IF NOT EXISTS bills_region_period_status_idx           ON bills (region_id, billing_period_id, status);
CREATE INDEX IF NOT EXISTS bills_customer_status_idx                ON bills (customer_id, status);
CREATE INDEX IF NOT EXISTS bills_due_date_idx                       ON bills (due_date);
CREATE INDEX IF NOT EXISTS bills_unpaid_idx                         ON bills (billing_period_id, region_id) WHERE status IN ('unpaid', 'partial');

-- ============================================================
-- 16. payment_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code                    VARCHAR(50)  NOT NULL,
  name                    VARCHAR(100) NOT NULL,
  description             TEXT,
  requires_reference_number BOOLEAN     NOT NULL DEFAULT false,
  status                  VARCHAR(20)  NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_code_uidx ON payment_methods (code);
CREATE INDEX IF NOT EXISTS payment_methods_status_idx       ON payment_methods (status);

-- ============================================================
-- 17. payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number          VARCHAR(60)   NOT NULL,
  customer_id             UUID          NOT NULL REFERENCES customers (id),
  officer_id              UUID          REFERENCES officers (id),
  recorded_by             UUID          NOT NULL REFERENCES users (id),
  payment_method_id       UUID          NOT NULL REFERENCES payment_methods (id),
  external_reference_number VARCHAR(120),
  amount                  NUMERIC(14,2) NOT NULL,
  payment_at              TIMESTAMPTZ   NOT NULL,
  recorded_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  latitude                NUMERIC(10,7),
  longitude               NUMERIC(10,7),
  notes                   TEXT,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'valid',
  idempotency_key         VARCHAR(120),
  voided_at               TIMESTAMPTZ,
  voided_by               UUID          REFERENCES users (id),
  void_reason             TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_number_uidx        ON payments (payment_number);
CREATE INDEX IF NOT EXISTS payments_customer_payment_at_idx           ON payments (customer_id, payment_at DESC);
CREATE INDEX IF NOT EXISTS payments_officer_payment_at_idx            ON payments (officer_id, payment_at DESC);
CREATE INDEX IF NOT EXISTS payments_recorded_by_payment_at_idx        ON payments (recorded_by, payment_at DESC);
CREATE INDEX IF NOT EXISTS payments_method_payment_at_idx             ON payments (payment_method_id, payment_at DESC);
CREATE INDEX IF NOT EXISTS payments_payment_at_idx                    ON payments (payment_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx                        ON payments (status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx       ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_external_reference_uidx    ON payments (external_reference_number) WHERE external_reference_number IS NOT NULL;

-- ============================================================
-- 18. payment_allocations
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       UUID          NOT NULL REFERENCES payments (id),
  bill_id          UUID          NOT NULL REFERENCES bills (id),
  allocated_amount NUMERIC(14,2) NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_allocations_payment_bill_uidx ON payment_allocations (payment_id, bill_id);
CREATE INDEX IF NOT EXISTS payment_allocations_payment_id_idx           ON payment_allocations (payment_id);
CREATE INDEX IF NOT EXISTS payment_allocations_bill_id_idx              ON payment_allocations (bill_id);

-- ============================================================
-- 19. payment_receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     UUID         NOT NULL REFERENCES payments (id),
  receipt_number VARCHAR(60)  NOT NULL,
  file_url       TEXT,
  issued_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_payment_id_uidx     ON payment_receipts (payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_receipts_receipt_number_uidx ON payment_receipts (receipt_number);

-- ============================================================
-- 20. dashboard_daily_summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_daily_summaries (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date          DATE          NOT NULL,
  region_id             UUID          REFERENCES regions (id),
  officer_id            UUID          REFERENCES officers (id),
  payment_method_id     UUID          REFERENCES payment_methods (id),
  total_payment_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payment_count   INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT unique_daily_summary UNIQUE (summary_date, region_id, officer_id, payment_method_id)
);

CREATE INDEX IF NOT EXISTS dashboard_daily_summaries_date_idx        ON dashboard_daily_summaries (summary_date DESC);
CREATE INDEX IF NOT EXISTS dashboard_daily_summaries_region_date_idx ON dashboard_daily_summaries (region_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS dashboard_daily_summaries_officer_date_idx ON dashboard_daily_summaries (officer_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS dashboard_daily_summaries_method_date_idx ON dashboard_daily_summaries (payment_method_id, summary_date DESC);

-- ============================================================
-- 21. dashboard_period_summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_period_summaries (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_period_id     UUID          NOT NULL REFERENCES billing_periods (id),
  region_id             UUID          REFERENCES regions (id),
  total_customers       INTEGER       NOT NULL DEFAULT 0,
  total_bills           INTEGER       NOT NULL DEFAULT 0,
  total_bill_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_outstanding_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_bill_count       INTEGER       NOT NULL DEFAULT 0,
  unpaid_bill_count     INTEGER       NOT NULL DEFAULT 0,
  partial_bill_count    INTEGER       NOT NULL DEFAULT 0,
  collection_rate       NUMERIC(7,4)  NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT unique_period_summary UNIQUE (billing_period_id, region_id)
);

CREATE INDEX IF NOT EXISTS dashboard_period_summaries_period_idx         ON dashboard_period_summaries (billing_period_id);
CREATE INDEX IF NOT EXISTS dashboard_period_summaries_region_period_idx  ON dashboard_period_summaries (region_id, billing_period_id);
CREATE INDEX IF NOT EXISTS dashboard_period_summaries_collection_rate_idx ON dashboard_period_summaries (collection_rate);

-- ============================================================
-- 22. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID         REFERENCES users (id),
  actor_role_code VARCHAR(30),
  action          VARCHAR(80)  NOT NULL,
  entity_table    VARCHAR(80)  NOT NULL,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  reason          TEXT,
  ip_address      INET,
  user_agent      TEXT,
  request_id      UUID,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_at_idx ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx           ON audit_logs (entity_table, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_created_at_idx ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx       ON audit_logs (created_at DESC);

-- ============================================================
-- 23. export_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS export_jobs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by  UUID         NOT NULL REFERENCES users (id),
  report_type   VARCHAR(50)  NOT NULL,
  parameters    JSONB,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  file_url      TEXT,
  row_count     INTEGER,
  error_message TEXT,
  requested_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS export_jobs_requested_by_idx   ON export_jobs (requested_by, requested_at DESC);
CREATE INDEX IF NOT EXISTS export_jobs_status_idx          ON export_jobs (status);
CREATE INDEX IF NOT EXISTS export_jobs_report_type_idx     ON export_jobs (report_type);
