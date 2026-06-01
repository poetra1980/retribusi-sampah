const repo = require('../repositories/addressRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const assertWargaAccess = async (customerId, currentUser, userRoles) => {
  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }
};

const listByCustomer = async (customerId, query, currentUser, userRoles) => {
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  await assertWargaAccess(customerId, currentUser, userRoles);

  const addresses = await repo.findByCustomerId(customerId, query.status);

  return { data: addresses };
};

const create = async (customerId, body, currentUser, context) => {
  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  const region = await repo.findRegionById(body.regionId);
  if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');

  const address = await repo.create(customerId, body);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_address.create', entityTable: 'customer_addresses', entityId: address.id,
    newValues: { customerId, ...body },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return address;
};

const getById = async (id, currentUser, userRoles) => {
  const address = await repo.findById(id);
  if (!address) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');

  await assertWargaAccess(address.customerId, currentUser, userRoles);

  return address;
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');

  if (body.regionId) {
    const region = await repo.findRegionById(body.regionId);
    if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  if (body.isPrimary) {
    const wasPrimary = existing.isPrimary;
    const updated = await repo.update(id, { ...body, customerId: existing.customerId });

    await repo.createAuditLog({
      actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
      action: 'customer_address.update', entityTable: 'customer_addresses', entityId: id,
      oldValues: { ...existing }, newValues: { ...updated },
      ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
    });

    return updated;
  }

  const updated = await repo.update(id, { ...body, customerId: existing.customerId });

  if (updated) {
    await repo.createAuditLog({
      actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
      action: 'customer_address.update', entityTable: 'customer_addresses', entityId: id,
      oldValues: { ...existing }, newValues: { ...updated },
      ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
    });
  }

  return updated;
};

const setPrimary = async (id, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Address is not active', 422, 'ADDRESS_NOT_ACTIVE');
  if (existing.isPrimary) return existing;

  const updated = await repo.setPrimary(id, existing.customerId);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_address.set_primary', entityTable: 'customer_addresses', entityId: id,
    oldValues: { isPrimary: false }, newValues: { isPrimary: true },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Address is not active', 422, 'ADDRESS_NOT_ACTIVE');

  const activeCount = await repo.countActiveByCustomerId(existing.customerId);
  if (activeCount <= 1) {
    throw new AppError(
      'Cannot deactivate the only active address. Add another address first.',
      422, 'LAST_ACTIVE_ADDRESS'
    );
  }

  const { reason } = body;
  const updated = await repo.deactivate(id);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer_address.deactivate', entityTable: 'customer_addresses', entityId: id,
    oldValues: { status: existing.status }, newValues: { status: 'inactive' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

module.exports = {
  getRequestContext, listByCustomer, create, getById, update, setPrimary, deactivate
};
