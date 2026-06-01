const Joi = require('joi');

const allocationSchema = Joi.object({
  billId: Joi.string().uuid().required(),
  allocatedAmount: Joi.number().positive().precision(2).required()
});

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  customerId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  paymentMethodId: Joi.string().uuid(),
  status: Joi.string().valid('valid', 'voided', 'pending_sync'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('paymentAt:desc')
});

const createSchema = Joi.object({
  customerId: Joi.string().uuid().required(),
  officerId: Joi.string().uuid().allow(null),
  paymentMethodId: Joi.string().uuid().required(),
  externalReferenceNumber: Joi.string().trim().max(120).allow(null, ''),
  amount: Joi.number().positive().precision(2).required(),
  paymentAt: Joi.date().iso().required(),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  notes: Joi.string().trim().max(500).allow(null, ''),
  allocations: Joi.array().items(allocationSchema).min(1).required()
});

const voidSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
});

const listPaymentMethodsQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('code:asc')
});

const createPaymentMethodSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().trim().allow(null, ''),
  requiresReferenceNumber: Joi.boolean().default(false),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updatePaymentMethodSchema = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().trim().allow(null, ''),
  requiresReferenceNumber: Joi.boolean(),
  status: Joi.string().valid('active', 'inactive')
}).min(1);

const deactivatePaymentMethodSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
});

module.exports = {
  listQuerySchema, createSchema, voidSchema,
  listPaymentMethodsQuerySchema, createPaymentMethodSchema,
  updatePaymentMethodSchema, deactivatePaymentMethodSchema
};
