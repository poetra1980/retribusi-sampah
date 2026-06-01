const AppError = require('../utils/AppError');

const validateRequest = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return next(new AppError('Invalid request', 400, 'VALIDATION_ERROR', details));
  }

  req[source] = value;
  return next();
};

module.exports = validateRequest;
