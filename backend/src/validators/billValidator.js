const Joi = require('joi');

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  customerId: Joi.string().uuid(),
  billingPeriodId: Joi.string().uuid(),
  regionId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  status: Joi.string().valid('unpaid', 'partial', 'paid', 'cancelled'),
  dueDateFrom: Joi.date().iso(),
  dueDateTo: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('createdAt:desc')
});

const generateSchema = Joi.object({
  billingPeriodId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Billing period ID is required' }),
  regionId: Joi.string().uuid().allow(null),
  categoryId: Joi.string().uuid().allow(null),
  dueDate: Joi.date().iso().required()
    .messages({ 'any.required': 'Due date is required' })
});

const listBatchesQuerySchema = Joi.object({
  billingPeriodId: Joi.string().uuid(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const cancelBillSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

const listPaymentsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = {
  listQuerySchema, generateSchema, listBatchesQuerySchema,
  cancelBillSchema, listPaymentsQuerySchema
};
