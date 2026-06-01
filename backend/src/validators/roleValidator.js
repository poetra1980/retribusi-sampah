const Joi = require('joi');

const updateUserRolesSchema = Joi.object({
  roleIds: Joi.array().items(Joi.number().integer().min(1)).min(1).required()
    .messages({
      'array.min': 'At least one role is required',
      'any.required': 'Role IDs are required'
    })
});

module.exports = {
  updateUserRolesSchema
};
