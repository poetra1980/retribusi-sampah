const Joi = require('joi');

const listQuerySchema = Joi.object({
  q: Joi.string().trim().max(255),
  regionId: Joi.string().uuid(),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  cursor: Joi.string().trim().max(255),
  sort: Joi.string().trim().max(100).default('officerNumber:asc')
});

const createOfficerSchema = Joi.object({
  userId: Joi.string().uuid().required()
    .messages({ 'any.required': 'User ID is required' }),
  officerNumber: Joi.string().trim().max(50).required()
    .messages({ 'any.required': 'Officer number is required' }),
  fullName: Joi.string().trim().max(150).required()
    .messages({ 'any.required': 'Full name is required' }),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  regionId: Joi.string().uuid().required()
    .messages({ 'any.required': 'Region is required' }),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
  joinedDate: Joi.date().iso().required()
    .messages({ 'any.required': 'Joined date is required' })
});

const updateOfficerSchema = Joi.object({
  fullName: Joi.string().trim().max(150),
  phoneNumber: Joi.string().trim().max(30).allow(null, ''),
  regionId: Joi.string().uuid(),
  status: Joi.string().valid('active', 'inactive', 'suspended'),
  joinedDate: Joi.date().iso()
}).min(1).messages({ 'object.min': 'At least one field must be provided' });

const deactivateOfficerSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required()
    .messages({ 'any.required': 'Reason is required' })
});

module.exports = {
  listQuerySchema,
  createOfficerSchema,
  updateOfficerSchema,
  deactivateOfficerSchema
};
