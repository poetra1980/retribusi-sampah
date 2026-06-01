const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

const seed = async () => {
  try {
    console.log('Seeding database...');

    // Roles
    await pool.query(`
      INSERT INTO roles (code, name, description) VALUES
        ('admin', 'Admin', 'Administrator sistem'),
        ('petugas', 'Petugas', 'Petugas lapangan'),
        ('warga', 'Warga', 'Warga atau pelanggan')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  roles seeded');

    // Admin user
    const adminPasswordHash = await hashPassword('admin123');
    const adminResult = await pool.query(`
      INSERT INTO users (username, email, full_name, password_hash, status)
      VALUES ('admin', 'admin@sampah.local', 'Admin Sistem', $1, 'active')
      ON CONFLICT (username) DO NOTHING
      RETURNING id
    `, [adminPasswordHash]);

    if (adminResult.rows.length > 0) {
      const adminId = adminResult.rows[0].id;
      const roleResult = await pool.query(`SELECT id FROM roles WHERE code = 'admin' LIMIT 1`);
      if (roleResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [adminId, roleResult.rows[0].id]
        );
      }
      console.log('  admin user seeded (username: admin, password: admin123)');
    } else {
      console.log('  admin user already exists');
    }

    // Payment methods
    await pool.query(`
      INSERT INTO payment_methods (code, name, description, requires_reference_number) VALUES
        ('cash', 'Tunai', 'Pembayaran tunai langsung', false),
        ('qris', 'QRIS', 'Pembayaran via QRIS', true),
        ('bank_transfer', 'Transfer Bank', 'Transfer antar bank', true),
        ('virtual_account', 'Virtual Account', 'Pembayaran via virtual account', true)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  payment methods seeded');

    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seed();
