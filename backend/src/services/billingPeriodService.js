const { randomUUID } = require('crypto');

const repo = require('../repositories/billingPeriodRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query) => {
  const { periods, nextCursor } = await repo.findAll(query);
  return { data: periods, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const create = async (body, currentUser, context) => {
  const { year, month, startDate, endDate, status } = body;

  const existing = await repo.findByYearMonth(year, month);
  if (existing) throw new AppError('Billing period for this year/month already exists', 409, 'DUPLICATE_PERIOD');

  const periodCode = `${year}-${String(month).padStart(2, '0')}`;
  const id = randomUUID();
  const period = await repo.create({ id, year, month, periodCode, startDate, endDate, status });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'billing_period.create', entityTable: 'billing_periods', entityId: id,
    newValues: { year, month, periodCode, startDate, endDate, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return period;
};

const getById = async (id) => {
  const period = await repo.findById(id);
  if (!period) throw new AppError('Billing period not found', 404, 'BILLING_PERIOD_NOT_FOUND');
  return period;
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Billing period not found', 404, 'BILLING_PERIOD_NOT_FOUND');
  if (existing.status === 'closed') throw new AppError('Cannot update a closed billing period', 422, 'PERIOD_CLOSED');

  const updateFields = {};
  const oldValues = {};
  const newValues = {};

  if (body.startDate !== undefined) { oldValues.startDate = existing.startDate; newValues.startDate = body.startDate; updateFields.startDate = body.startDate; }
  if (body.endDate !== undefined) { oldValues.endDate = existing.endDate; newValues.endDate = body.endDate; updateFields.endDate = body.endDate; }
  if (body.status !== undefined) {
    if (existing.status === 'draft' && body.status === 'closed') {
      throw new AppError('Period must be opened before closing', 422, 'INVALID_STATUS_TRANSITION');
    }
    oldValues.status = existing.status;
    newValues.status = body.status;
    updateFields.status = body.status;
  }

  const updated = await repo.update(id, updateFields);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'billing_period.update', entityTable: 'billing_periods', entityId: id,
    oldValues, newValues,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const close = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Billing period not found', 404, 'BILLING_PERIOD_NOT_FOUND');
  if (existing.status !== 'open') throw new AppError('Only open periods can be closed', 422, 'PERIOD_NOT_OPEN');

  const { reason } = body;
  const updated = await repo.update(id, { status: 'closed' });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'billing_period.close', entityTable: 'billing_periods', entityId: id,
    oldValues: { status: existing.status }, newValues: { status: 'closed' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const reopen = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Billing period not found', 404, 'BILLING_PERIOD_NOT_FOUND');
  if (existing.status !== 'closed') throw new AppError('Only closed periods can be reopened', 422, 'PERIOD_NOT_CLOSED');

  const { reason } = body;
  const updated = await repo.update(id, { status: 'open' });

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'billing_period.reopen', entityTable: 'billing_periods', entityId: id,
    oldValues: { status: existing.status }, newValues: { status: 'open' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

module.exports = { getRequestContext, list, create, getById, update, close, reopen };
