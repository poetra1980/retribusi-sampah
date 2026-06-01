const Joi = require('joi');

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  categoryId: Joi.string().uuid(),
  regionId: Joi.string().uuid(),
  status: Joi.string().valid('active', 'inactive'),
  effectiveDate: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('code:asc')
});

const createSchema = Joi.object({
  code: Joi.string().trim().max(50).required()
    .messages({ 'any.required': 'Code is required' }),
  name: Joi.string().trim().max(150).required()
    .messages({ 'any.required': 'Name is required' }),
  categoryId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Category is required' }),
  regionId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().precision(2).required()
    .messages({ 'any.required': 'Amount is required', 'number.positive': 'Amount must be greater than 0' }),
  effectiveStartDate: Joi.date().iso().required()
    .messages({ 'any.required': 'Effective start date is required' }),
  effectiveEndDate: Joi.date().iso().allow(null).min(Joi.ref('effectiveStartDate')),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateSchema = Joi.object({
  name: Joi.string().trim().max(150),
  categoryId: Joi.string().uuid(),
  regionId: Joi.string().uuid().allow(null),
  amount: Joi.number().positive().precision(2),
  effectiveStartDate: Joi.date().iso(),
  effectiveEndDate: Joi.date().iso().allow(null),
  status: Joi.string().valid('active', 'inactive'),
  reason: Joi.string().trim().max(1000)
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
  effectiveEndDate: Joi.date().iso().allow(null)
});

const listHistoriesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = {
  listQuerySchema, createSchema, updateSchema, deactivateSchema, listHistoriesQuerySchema
};
