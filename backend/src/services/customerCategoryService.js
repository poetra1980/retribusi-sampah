const { randomUUID } = require('crypto');

const repo = require('../repositories/customerCategoryRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query) => {
  const { categories, nextCursor } = await repo.findAll(query);

  return {
    data: categories,
    pagination: { limit: query.limit, nextCursor, prevCursor: null }
  };
};

const create = async (body, currentUser, context) => {
  const { code, name, description, status } = body;

  const existing = await repo.findByCode(code);
  if (existing) throw new AppError('Category code already exists', 409, 'DUPLICATE_CODE');

  const id = randomUUID();
  const category = await repo.create({ id, code, name, description, status });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_category.create', entityTable: 'customer_categories', entityId: id,
    newValues: { code, name, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return category;
};

const getById = async (id) => {
  const category = await repo.findById(id);
  if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  return category;
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');

  const { code, name, description, status } = body;

  if (code !== undefined && code !== existing.code) {
    const dup = await repo.findByCode(code);
    if (dup) throw new AppError('Category code already exists', 409, 'DUPLICATE_CODE');
  }

  const oldValues = { code: existing.code, name: existing.name, status: existing.status };
  const updateFields = {};
  if (code !== undefined) updateFields.code = code;
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (status !== undefined) updateFields.status = status;

  const updated = await repo.update(id, updateFields);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_category.update', entityTable: 'customer_categories', entityId: id,
    oldValues, newValues: { code, name, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Category is not active', 422, 'CATEGORY_NOT_ACTIVE');

  const hasCustomers = await repo.hasActiveCustomers(id);
  if (hasCustomers) {
    throw new AppError(
      'Cannot deactivate category used by active customers. Migrate customers first.',
      422, 'CATEGORY_HAS_ACTIVE_CUSTOMERS'
    );
  }

  const { reason } = body;
  const updated = await repo.deactivate(id);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_category.deactivate', entityTable: 'customer_categories', entityId: id,
    oldValues: { status: existing.status }, newValues: { status: 'inactive' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

module.exports = { getRequestContext, list, create, getById, update, deactivate };
