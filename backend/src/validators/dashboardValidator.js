const Joi = require('joi');

const overviewSchema = Joi.object({
  billingPeriodId: Joi.string().uuid(),
  regionId: Joi.string().uuid()
});

const dailySchema = Joi.object({
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().required(),
  regionId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  paymentMethodId: Joi.string().uuid()
});

const latestSchema = Joi.object({
  regionId: Joi.string().uuid(),
  officerId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

const regionsSchema = Joi.object({
  billingPeriodId: Joi.string().uuid(),
  parentRegionId: Joi.string().uuid()
});

const officersSchema = Joi.object({
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().required(),
  regionId: Joi.string().uuid(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = { overviewSchema, dailySchema, latestSchema, regionsSchema, officersSchema };
