const AppError = require('../utils/AppError');

const authorizeRole = (...allowedRoles) => (req, res, next) => {
  if (!req.roles || req.roles.length === 0) {
    return next(new AppError('Access denied. No roles assigned.', 403, 'ACCESS_DENIED'));
  }

  const hasRole = req.roles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return next(new AppError('Access denied. Insufficient permissions.', 403, 'ACCESS_DENIED'));
  }

  return next();
};

module.exports = authorizeRole;
