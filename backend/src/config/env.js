const dotenv = require('dotenv');

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  appName: process.env.APP_NAME || 'Digital Retribusi Sampah API',
  host: process.env.APP_HOST || '0.0.0.0',
  port: toNumber(process.env.APP_PORT, 3000),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: toNumber(process.env.DATABASE_PORT, 5432),
    name: process.env.DATABASE_NAME || 'retribusi_sampah',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    ssl: toBoolean(process.env.DATABASE_SSL, false),
    poolMin: toNumber(process.env.DATABASE_POOL_MIN, 2),
    poolMax: toNumber(process.env.DATABASE_POOL_MAX, 10),
    idleTimeoutMillis: toNumber(process.env.DATABASE_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: toNumber(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 5000)
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-this-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 12)
};

module.exports = env;
