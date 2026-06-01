const Joi = require('joi');

const createAddressSchema = Joi.object({
  regionId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Region is required' }),
  addressLine: Joi.string().trim().max(500).allow(null, ''),
  rt: Joi.string().trim().max(10).required()
    .messages({ 'any.required': 'RT is required' }),
  rw: Joi.string().trim().max(10).required()
    .messages({ 'any.required': 'RW is required' }),
  tpsCode: Joi.string().trim().max(50).allow(null, ''),
  tpsName: Joi.string().trim().max(150).allow(null, ''),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  isPrimary: Joi.boolean().default(false),
  status: Joi.string().valid('active', 'inactive').default('active')
});

const updateAddressSchema = Joi.object({
  regionId: Joi.string().uuid(),
  addressLine: Joi.string().trim().max(500).allow(null, ''),
  rt: Joi.string().trim().max(10),
  rw: Joi.string().trim().max(10),
  tpsCode: Joi.string().trim().max(50).allow(null, ''),
  tpsName: Joi.string().trim().max(150).allow(null, ''),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null),
  isPrimary: Joi.boolean(),
  status: Joi.string().valid('active', 'inactive')
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateAddressSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
  deactivateAddressSchema
};
