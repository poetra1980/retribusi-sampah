const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../src/config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, '../database/migrations');
const MIGRATIONS_TABLE = '_migrations';

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `);
};

const getApplied = async () => {
  const result = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return new Set(result.rows.map((r) => r.filename));
};

const markApplied = async (filename) => {
  await pool.query(`INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`, [filename]);
};

const run = async () => {
  try {
    console.log('Checking database connection...');
    await pool.query('SELECT 1');
    console.log('Connected to database.');

    await ensureMigrationsTable();

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    const applied = await getApplied();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('All migrations already applied.');
      await pool.end();
      return;
    }

    for (const file of pending) {
      console.log(`Applying: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await pool.query(sql);
      await markApplied(file);
      console.log(`Applied: ${file}`);
    }

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
