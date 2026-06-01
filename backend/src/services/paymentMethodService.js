const { randomUUID } = require('crypto');

const repo = require('../repositories/paymentMethodRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query) => {
  const { methods, nextCursor } = await repo.findAll(query);
  return { data: methods, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getById = async (id) => {
  const method = await repo.findById(id);
  if (!method) throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD_NOT_FOUND');
  return method;
};

const create = async (body, currentUser, context) => {
  const { code, name, description, requiresReferenceNumber, status } = body;

  const dup = await repo.findByCode(code);
  if (dup) throw new AppError('Payment method code already exists', 409, 'DUPLICATE_CODE');

  const id = randomUUID();
  const method = await repo.create({ id, code, name, description, requiresReferenceNumber, status });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'payment_method.create', entityTable: 'payment_methods', entityId: id,
    newValues: { code, name, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return method;
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD_NOT_FOUND');

  const updateFields = {};
  const oldValues = {};

  if (body.name !== undefined) { oldValues.name = existing.name; updateFields.name = body.name; }
  if (body.description !== undefined) { updateFields.description = body.description; }
  if (body.requiresReferenceNumber !== undefined) { updateFields.requiresReferenceNumber = body.requiresReferenceNumber; }
  if (body.status !== undefined) { oldValues.status = existing.status; updateFields.status = body.status; }

  const updated = await repo.update(id, updateFields);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'payment_method.update', entityTable: 'payment_methods', entityId: id,
    oldValues, newValues: updateFields,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Payment method is not active', 422, 'PAYMENT_METHOD_NOT_ACTIVE');

  const { reason } = body;
  const updated = await repo.deactivate(id);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'payment_method.deactivate', entityTable: 'payment_methods', entityId: id,
    oldValues: { status: existing.status }, newValues: { status: 'inactive' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

module.exports = { getRequestContext, list, getById, create, update, deactivate };
