const Joi = require('joi');

const dailySchema = Joi.object({
  date: Joi.date().iso().required(),
  regionId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  paymentMethodId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const monthlySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  regionId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  paymentMethodId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const yearlySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required(),
  regionId: Joi.string().uuid(),
  paymentMethodId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const arrearsSchema = Joi.object({
  billingPeriodId: Joi.string().uuid().required(),
  regionId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  minOutstandingAmount: Joi.number().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const collectionRateSchema = Joi.object({
  billingPeriodId: Joi.string().uuid().required(),
  regionId: Joi.string().uuid()
});

const officerPerformanceSchema = Joi.object({
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().required(),
  regionId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

const createExportSchema = Joi.object({
  reportType: Joi.string().valid(
    'payments_daily', 'payments_monthly', 'payments_yearly',
    'arrears', 'collection_rate', 'officer_performance'
  ).required(),
  format: Joi.string().valid('csv', 'xlsx').required(),
  parameters: Joi.object().required()
});

const listExportsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'expired'),
  reportType: Joi.string(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = {
  dailySchema, monthlySchema, yearlySchema, arrearsSchema,
  collectionRateSchema, officerPerformanceSchema,
  createExportSchema, listExportsQuerySchema
};
