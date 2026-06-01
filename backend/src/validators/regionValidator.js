const Joi = require('joi');

const validLevels = ['kecamatan', 'kelurahan', 'rw', 'rt'];

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  parentId: Joi.string().uuid(),
  level: Joi.string().valid(...validLevels),
  status: Joi.string().valid('active', 'inactive'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('code:asc')
});

const treeQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  level: Joi.string().valid(...validLevels)
});

const createRegionSchema = Joi.object({
  parentId: Joi.string().uuid().allow(null),
  code: Joi.string().trim().max(50).required()
    .messages({ 'any.required': 'Code is required' }),
  name: Joi.string().trim().max(150).required()
    .messages({ 'any.required': 'Name is required' }),
  level: Joi.string().valid(...validLevels).required()
    .messages({ 'any.required': 'Level is required' }),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateRegionSchema = Joi.object({
  parentId: Joi.string().uuid().allow(null),
  code: Joi.string().trim().max(50),
  name: Joi.string().trim().max(150),
  level: Joi.string().valid(...validLevels),
  status: Joi.string().valid('active', 'inactive')
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateRegionSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

module.exports = {
  listQuerySchema,
  treeQuerySchema,
  createRegionSchema,
  updateRegionSchema,
  deactivateRegionSchema
};
