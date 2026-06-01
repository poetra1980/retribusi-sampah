const { randomUUID } = require('crypto');

const repo = require('../repositories/tariffRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query) => {
  const { tariffs, nextCursor } = await repo.findAll(query);
  return { data: tariffs, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const create = async (body, currentUser, context) => {
  const { code, name, categoryId, regionId, amount, effectiveStartDate, effectiveEndDate, status } = body;

  const dup = await repo.findByCode(code);
  if (dup) throw new AppError('Tariff code already exists', 409, 'DUPLICATE_CODE');

  const category = await repo.findCategoryById(categoryId);
  if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');

  if (regionId) {
    const region = await repo.findRegionById(regionId);
    if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  const id = randomUUID();
  const tariff = await repo.create({ id, code, name, categoryId, regionId, amount, effectiveStartDate, effectiveEndDate, status, createdBy: currentUser.id });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'tariff.create', entityTable: 'tariffs', entityId: id,
    newValues: { code, name, categoryId, amount, effectiveStartDate, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return tariff;
};

const getById = async (id) => {
  const tariff = await repo.findById(id);
  if (!tariff) throw new AppError('Tariff not found', 404, 'TARIFF_NOT_FOUND');
  return tariff;
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Tariff not found', 404, 'TARIFF_NOT_FOUND');

  const { name, categoryId, regionId, amount, effectiveStartDate, effectiveEndDate, status, reason } = body;

  if (categoryId) {
    const cat = await repo.findCategoryById(categoryId);
    if (!cat) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  if (regionId !== undefined && regionId) {
    const region = await repo.findRegionById(regionId);
    if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  const changedAmount = amount !== undefined && amount !== existing.amount;
  const changedEffectiveDate = (effectiveStartDate !== undefined && effectiveStartDate !== existing.effectiveStartDate);

  if ((changedAmount || changedEffectiveDate) && !reason) {
    throw new AppError('Reason is required when changing amount or effective dates', 422, 'REASON_REQUIRED');
  }

  const updateFields = { updatedBy: currentUser.id };
  if (name !== undefined) updateFields.name = name;
  if (categoryId !== undefined) updateFields.categoryId = categoryId;
  if (regionId !== undefined) updateFields.regionId = regionId;
  if (amount !== undefined) updateFields.amount = amount;
  if (effectiveStartDate !== undefined) updateFields.effectiveStartDate = effectiveStartDate;
  if (effectiveEndDate !== undefined) updateFields.effectiveEndDate = effectiveEndDate;
  if (status !== undefined) updateFields.status = status;

  const updated = await repo.update(id, updateFields);

  if (changedAmount || changedEffectiveDate) {
    await repo.createHistory({
      tariffId: id,
      oldAmount: existing.amount,
      newAmount: amount !== undefined ? amount : existing.amount,
      oldEffectiveStartDate: existing.effectiveStartDate,
      newEffectiveStartDate: effectiveStartDate !== undefined ? effectiveStartDate : existing.effectiveStartDate,
      reason,
      changedBy: currentUser.id
    });
  }

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'tariff.update', entityTable: 'tariffs', entityId: id,
    oldValues: { name: existing.name, amount: existing.amount, status: existing.status },
    newValues: { name, amount, status },
    reason, ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Tariff not found', 404, 'TARIFF_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Tariff is not active', 422, 'TARIFF_NOT_ACTIVE');

  const { reason, effectiveEndDate } = body;
  const updateFields = { status: 'inactive', updatedBy: currentUser.id };
  if (effectiveEndDate) updateFields.effectiveEndDate = effectiveEndDate;

  const updated = await repo.update(id, updateFields);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'tariff.deactivate', entityTable: 'tariffs', entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: 'inactive' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const getHistories = async (id, query) => {
  const tariff = await repo.findById(id);
  if (!tariff) throw new AppError('Tariff not found', 404, 'TARIFF_NOT_FOUND');

  const { histories, nextCursor } = await repo.findHistoriesByTariffId(id, query);

  return { data: histories, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

module.exports = { getRequestContext, list, create, getById, update, deactivate, getHistories };
