const app = require('./app');
const env = require('./config/env');
const { closeDatabase, pool } = require('./config/database');
const logger = require('./utils/logger');

let server;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');

    server = app.listen(env.port, env.host, () => {
      logger.info(`${env.appName} running on ${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down server.`);

  if (server) {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    return;
  }

  await closeDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();
