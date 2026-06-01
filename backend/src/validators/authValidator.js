const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required'
  });

const loginSchema = Joi.object({
  username: Joi.string().trim().max(255),
  email: Joi.string().trim().email().max(255),
  password: Joi.string().required()
}).xor('username', 'email');

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().trim().required()
});

const logoutSchema = refreshTokenSchema;

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Password confirmation does not match'
  })
});

module.exports = {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema
};
