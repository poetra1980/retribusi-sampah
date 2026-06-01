const Joi = require('joi');

const listSchema = Joi.object({
  actorUserId: Joi.string().uuid(),
  actorRoleCode: Joi.string().trim().max(30),
  action: Joi.string().trim().max(80),
  entityTable: Joi.string().trim().max(80),
  entityId: Joi.string().uuid(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().valid('asc', 'desc').default('desc')
});

const idSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const entityListSchema = Joi.object({
  entityTable: Joi.string().valid(
    'customers', 'customer_addresses', 'users', 'officers',
    'tariffs', 'payment_methods', 'regions', 'customer_categories',
    'bills', 'payments', 'payment_allocations', 'export_jobs'
  ).required(),
  entityId: Joi.string().uuid().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255)
});

module.exports = { listSchema, idSchema, entityListSchema };
