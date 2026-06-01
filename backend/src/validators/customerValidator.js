const Joi = require('joi');

const addressObject = Joi.object({
  regionId: Joi.string().uuid().required(),
  addressLine: Joi.string().trim().max(500).allow(null, ''),
  rt: Joi.string().trim().max(10).allow(null, ''),
  rw: Joi.string().trim().max(10).allow(null, ''),
  tpsCode: Joi.string().trim().max(50).allow(null, ''),
  tpsName: Joi.string().trim().max(150).allow(null, ''),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  isPrimary: Joi.boolean().default(true),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  customerNumber: Joi.string().trim().max(50),
  nik: Joi.string().trim().max(30),
  regionId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
  rt: Joi.string().trim().max(10),
  rw: Joi.string().trim().max(10),
  tpsCode: Joi.string().trim().max(50),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('customerNumber:asc')
});

const createSchema = Joi.object({
  customerNumber: Joi.string().trim().max(50).required()
    .messages({ 'any.required': 'Customer number is required' }),
  nik: Joi.string().trim().max(30).allow(null, ''),
  fullName: Joi.string().trim().max(150).required()
    .messages({ 'any.required': 'Full name is required' }),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  regionId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Region is required' }),
  categoryId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Category is required' }),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
  startDate: Joi.date().iso().required()
    .messages({ 'any.required': 'Start date is required' }),
  address: addressObject
});

const updateSchema = Joi.object({
  nik: Joi.string().trim().max(30).allow(null, ''),
  fullName: Joi.string().trim().max(150),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  regionId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().allow(null)
}).min(1).messages({ 'object.min': 'At least one field must be provided' }).custom((value, helpers) => {
  if (value.endDate && value.startDate && new Date(value.endDate) < new Date(value.startDate)) {
    return helpers.error('any.custom', { message: 'endDate must be >= startDate' });
  }
  return value;
});

const deactivateSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
  endDate: Joi.date().iso().allow(null)
});

const linkUserSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  isPrimary: Joi.boolean().default(true)
});

const unlinkUserSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  reason: Joi.string().trim().min(1).max(500).required()
});

const listBillsQuerySchema = Joi.object({
  billingPeriodId: Joi.string().uuid(),
  status: Joi.string().valid('unpaid', 'partial', 'paid', 'cancelled'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const listPaymentsQuerySchema = Joi.object({
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  paymentMethodId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = {
  listQuerySchema,
  createSchema,
  updateSchema,
  deactivateSchema,
  linkUserSchema,
  unlinkUserSchema,
  listBillsQuerySchema,
  listPaymentsQuerySchema
};
