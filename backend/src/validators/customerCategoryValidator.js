const Joi = require('joi');

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  status: Joi.string().valid('active', 'inactive'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('code:asc')
});

const createSchema = Joi.object({
  code: Joi.string().trim().max(50).required()
    .messages({ 'any.required': 'Code is required' }),
  name: Joi.string().trim().max(100).required()
    .messages({ 'any.required': 'Name is required' }),
  description: Joi.string().trim().allow(null, ''),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateSchema = Joi.object({
  code: Joi.string().trim().max(50),
  name: Joi.string().trim().max(100),
  description: Joi.string().trim().allow(null, ''),
  status: Joi.string().valid('active', 'inactive')
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

module.exports = {
  listQuerySchema,
  createSchema,
  updateSchema,
  deactivateSchema
};
