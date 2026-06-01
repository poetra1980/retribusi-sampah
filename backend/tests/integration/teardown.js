const { pool } = require('../src/config/database');

module.exports = async () => {
  await pool.end();
};
