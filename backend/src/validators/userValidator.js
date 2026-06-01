const Joi = require('joi');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required'
  });

const userStatusSchema = Joi.string()
  .valid('active', 'inactive', 'locked')
  .default('active');

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  status: Joi.string().valid('active', 'inactive', 'locked'),
  role: Joi.string().trim().max(30),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('createdAt:desc')
});

const createUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(80).required()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string().trim().email().max(255).allow(null, ''),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  password: passwordSchema,
  fullName: Joi.string().trim().max(150).required()
    .messages({ 'any.required': 'Full name is required' }),
  status: userStatusSchema,
  roleIds: Joi.array().items(Joi.number().integer().min(1)).min(1).required()
    .messages({
      'array.min': 'At least one role is required',
      'any.required': 'Role IDs are required'
    })
});

const updateUserSchema = Joi.object({
  email: Joi.string().trim().email().max(255).allow(null, ''),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  fullName: Joi.string().trim().max(150),
  status: Joi.string().valid('active', 'inactive', 'locked'),
  roleIds: Joi.array().items(Joi.number().integer().min(1)).min(1)
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateUserSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

const resetPasswordSchema = Joi.object({
  newPassword: passwordSchema,
  forceChangePassword: Joi.boolean().default(false)
});

module.exports = {
  listQuerySchema,
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  resetPasswordSchema
};
