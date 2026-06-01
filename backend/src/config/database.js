const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  min: env.database.poolMin,
  max: env.database.poolMax,
  idleTimeoutMillis: env.database.idleTimeoutMillis,
  connectionTimeoutMillis: env.database.connectionTimeoutMillis,
  ssl: env.database.ssl ? { rejectUnauthorized: false } : false
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const closeDatabase = () => pool.end();

module.exports = {
  pool,
  query,
  withTransaction,
  closeDatabase
};
