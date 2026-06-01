const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()} ${message}${suffix}`;
};

const logger = {
  info(message, meta) {
    console.log(formatMessage('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatMessage('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatMessage('error', message, meta));
  }
};

module.exports = logger;
