const { pool } = require('../../src/config/database');
const { randomUUID } = require('crypto');
const { hashPassword } = require('../../src/utils/password');

const seedTestData = async () => {
  const roleResult = await pool.query(`SELECT id, code FROM roles WHERE code IN ('admin', 'petugas', 'warga')`);
  const roles = {};
  for (const row of roleResult.rows) {
    roles[row.code] = row.id;
  }

  const adminPasswordHash = await hashPassword('admin123');
  const adminId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, username, email, full_name, password_hash, status)
     VALUES ($1, 'testadmin', 'testadmin@test.com', 'Test Admin', $2, 'active')
     ON CONFLICT (username) DO UPDATE SET full_name = 'Test Admin' RETURNING id`,
    [adminId, adminPasswordHash]
  );

  await pool.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [adminId, roles.admin]
  );

  const regionId = randomUUID();
  await pool.query(
    `INSERT INTO regions (id, code, name, level, status)
     VALUES ($1, 'TST-01', 'Test Region', 'kecamatan', 'active')
     ON CONFLICT (code) DO UPDATE SET name = 'Test Region' RETURNING id`,
    [regionId]
  );

  const categoryId = randomUUID();
  await pool.query(
    `INSERT INTO customer_categories (id, code, name, status)
     VALUES ($1, 'TST-CAT', 'Test Category', 'active')
     ON CONFLICT (code) DO UPDATE SET name = 'Test Category' RETURNING id`,
    [categoryId]
  );

  const paymentMethodId = randomUUID();
  await pool.query(
    `INSERT INTO payment_methods (id, code, name, status)
     VALUES ($1, 'TST-CASH', 'Test Cash', 'active')
     ON CONFLICT (code) DO UPDATE SET name = 'Test Cash' RETURNING id`,
    [paymentMethodId]
  );

  return { adminId, regionId, categoryId, paymentMethodId, roles };
};

const cleanupTestData = async () => {
  await pool.query(`
    DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE username LIKE 'test%');
    DELETE FROM audit_logs WHERE entity_table IN ('customers', 'regions', 'payments', 'bills', 'users');
    DELETE FROM payment_allocations;
    DELETE FROM payment_receipts;
    DELETE FROM payments;
    DELETE FROM bills;
    DELETE FROM bill_generation_batches;
    DELETE FROM customer_user_accounts;
    DELETE FROM customer_addresses;
    DELETE FROM customers;
    DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'test%');
    DELETE FROM officers WHERE full_name LIKE 'Test%';
    DELETE FROM users WHERE username LIKE 'test%';
    DELETE FROM regions WHERE code LIKE 'TST-%';
    DELETE FROM customer_categories WHERE code LIKE 'TST-%';
    DELETE FROM payment_methods WHERE code LIKE 'TST-%';
  `);
};

const loginAsAdmin = async (request) => {
  const res = await request
    .post('/api/v1/auth/login')
    .send({ username: 'testadmin', password: 'admin123' });

  if (res.body.data && res.body.data.accessToken) {
    return res.body.data.accessToken;
  }

  const seedRes = await request
    .post('/api/v1/auth/login')
    .send({ username: 'testadmin', password: 'admin123' });

  return seedRes.body.data ? seedRes.body.data.accessToken : null;
};

const closePool = async () => {
  try { await pool.end(); } catch (e) { /* pool already closed */ }
};

module.exports = { seedTestData, cleanupTestData, loginAsAdmin, closePool };
