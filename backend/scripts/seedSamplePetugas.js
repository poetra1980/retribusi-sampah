const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');

const seedSamplePetugas = async () => {
  try {
    console.log('Seeding sample petugas...');

    // 1. Check if petugas user already exists
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE username = 'petugas1' LIMIT 1`
    );

    let userId;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log('  petugas user already exists');
    } else {
      const passwordHash = await hashPassword('petugas123');
      const userResult = await pool.query(
        `INSERT INTO users (username, email, full_name, password_hash, status)
         VALUES ('petugas1', 'petugas1@sampah.local', 'Petugas Lapangan 1', $1, 'active')
         RETURNING id`,
        [passwordHash]
      );
      userId = userResult.rows[0].id;
      console.log('  petugas user created (username: petugas1, password: petugas123)');
    }

    // 2. Assign role 'petugas' to the user
    const roleResult = await pool.query(`SELECT id FROM roles WHERE code = 'petugas' LIMIT 1`);

    if (roleResult.rows.length > 0) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, roleResult.rows[0].id]
      );
      console.log('  petugas role assigned');
    } else {
      console.log('  WARNING: petugas role not found. Run seed.js first.');
    }

    // 3. Check if officer profile already exists
    const existingOfficer = await pool.query(
      `SELECT id FROM officers WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (existingOfficer.rows.length > 0) {
      console.log('  officer profile already exists');
    } else {
      // 4. Find or create a sample region
      let regionId;

      const existingRegion = await pool.query(
        `SELECT id FROM regions ORDER BY level ASC, name ASC LIMIT 1`
      );

      if (existingRegion.rows.length > 0) {
        regionId = existingRegion.rows[0].id;
        console.log('  using existing region:', regionId);
      } else {
        // Create a sample region hierarchy
        const kecResult = await pool.query(
          `INSERT INTO regions (code, name, level, status)
           VALUES ('KEC-001', 'Kecamatan Contoh', 'kecamatan', 'active')
           RETURNING id`
        );
        const kecId = kecResult.rows[0].id;

        const kelResult = await pool.query(
          `INSERT INTO regions (code, name, level, parent_id, status)
           VALUES ('KEL-001', 'Kelurahan Contoh', 'kelurahan', $1, 'active')
           RETURNING id`,
          [kecId]
        );
        regionId = kelResult.rows[0].id;

        const adminResult = await pool.query(
          `SELECT id FROM users WHERE username = 'admin' LIMIT 1`
        );
        const adminId = adminResult.rows.length > 0 ? adminResult.rows[0].id : userId;

        await pool.query(
          `INSERT INTO regions (code, name, level, parent_id, status)
           VALUES ('RW-001', 'RW 01', 'rw', $1, 'active')`,
          [regionId]
        );

        console.log('  sample regions created');
      }

      // 5. Create officer profile
      const adminResult = await pool.query(
        `SELECT id FROM users WHERE username = 'admin' LIMIT 1`
      );
      const adminId = adminResult.rows.length > 0 ? adminResult.rows[0].id : userId;

      await pool.query(
        `INSERT INTO officers (user_id, officer_number, full_name, phone_number, region_id, status, joined_date, created_by)
         VALUES ($1, 'NIP-001', 'Petugas Lapangan 1', '081234567890', $2, 'active', CURRENT_DATE, $3)`,
        [userId, regionId, adminId]
      );
      console.log('  officer profile created');
    }

    console.log('\n=== SAMPLE ACCOUNT READY ===');
    console.log('  Username: petugas1');
    console.log('  Password: petugas123');
    console.log('  Role: Petugas');
    console.log('  Login URL: http://localhost:3001/pwa/login');
    console.log('============================\n');
  } catch (error) {
    console.error('Seed sample petugas failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

seedSamplePetugas();
