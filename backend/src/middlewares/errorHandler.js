const logger = require('../utils/logger');

const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || error.status || 500;
  const isOperational = statusCode < 500;

  if (!isOperational) {
    logger.error('Unhandled application error', error);
  }

  res.status(statusCode).json({
    error: {
      code: error.code || (isOperational ? 'REQUEST_ERROR' : 'INTERNAL_SERVER_ERROR'),
      message: isOperational ? error.message : 'Internal server error',
      details: error.details || []
    },
    meta: {
      requestId: req.headers['x-request-id'] || null
    }
  });

};

module.exports = errorHandler;
