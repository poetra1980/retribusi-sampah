const Joi = require('joi');

const listQuerySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100),
  month: Joi.number().integer().min(1).max(12),
  status: Joi.string().valid('draft', 'open', 'closed'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('periodCode:desc')
});

const createSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  status: Joi.string().valid('draft', 'open').default('draft')
});

const updateSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  status: Joi.string().valid('draft', 'open')
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const closeSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

const reopenSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

module.exports = { listQuerySchema, createSchema, updateSchema, closeSchema, reopenSchema };
