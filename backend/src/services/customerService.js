const { randomUUID } = require('crypto');

const repo = require('../repositories/customerRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query, currentUser, context) => {
  const { customers, nextCursor } = await repo.findAll(query);

  return {
    data: customers,
    pagination: { limit: query.limit, nextCursor, prevCursor: null }
  };
};

const create = async (body, currentUser, context) => {
  const { customerNumber, nik, fullName, phoneNumber, regionId, categoryId, status, startDate, address } = body;

  const dup = await repo.findByCustomerNumber(customerNumber);
  if (dup) throw new AppError('Customer number already exists', 409, 'DUPLICATE_CUSTOMER_NUMBER');

  const [region, category] = await Promise.all([
    repo.findRegionById(regionId),
    repo.findCategoryById(categoryId)
  ]);

  if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');

  const id = randomUUID();
  const customer = await repo.create({
    id, customerNumber, nik, fullName, phoneNumber,
    regionId, categoryId, status, startDate, createdBy: currentUser.id
  });

  if (address) {
    const addrRegion = await repo.findRegionById(address.regionId);
    if (!addrRegion) throw new AppError('Address region not found', 404, 'ADDRESS_REGION_NOT_FOUND');

    await repo.createAddress({
      id: randomUUID(), customerId: id, ...address
    });
  }

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer.create', entityTable: 'customers', entityId: id,
    newValues: { customerNumber, fullName, regionId, categoryId, status },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return { ...customer, regionName: region.name, categoryName: category.name };
};

const getById = async (id, currentUser, userRoles) => {
  const customer = await repo.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, id);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const [addresses, userAccounts] = await Promise.all([
    repo.findAddressesByCustomerId(id),
    repo.findUserAccountsByCustomerId(id)
  ]);

  return { ...customer, addresses, userAccounts };
};

const update = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  const { nik, fullName, phoneNumber, regionId, categoryId, status, startDate, endDate } = body;

  if (regionId) {
    const region = await repo.findRegionById(regionId);
    if (!region) throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  if (categoryId) {
    const category = await repo.findCategoryById(categoryId);
    if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
  }

  const oldValues = {};
  const newValues = {};
  const updateFields = { updatedBy: currentUser.id };

  if (nik !== undefined) { oldValues.nik = existing.nik; newValues.nik = nik; updateFields.nik = nik; }
  if (fullName !== undefined) { oldValues.fullName = existing.fullName; newValues.fullName = fullName; updateFields.fullName = fullName; }
  if (phoneNumber !== undefined) { oldValues.phoneNumber = existing.phoneNumber; newValues.phoneNumber = phoneNumber; updateFields.phoneNumber = phoneNumber; }
  if (regionId !== undefined) { oldValues.regionId = existing.regionId; newValues.regionId = regionId; updateFields.regionId = regionId; }
  if (categoryId !== undefined) { oldValues.categoryId = existing.categoryId; newValues.categoryId = categoryId; updateFields.categoryId = categoryId; }
  if (status !== undefined) { oldValues.status = existing.status; newValues.status = status; updateFields.status = status; }
  if (startDate !== undefined) { oldValues.startDate = existing.startDate; newValues.startDate = startDate; updateFields.startDate = startDate; }
  if (endDate !== undefined) { oldValues.endDate = existing.endDate; newValues.endDate = endDate; updateFields.endDate = endDate; }

  const updated = await repo.update(id, updateFields);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer.update', entityTable: 'customers', entityId: id,
    oldValues, newValues,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await repo.findById(id);
  if (!existing) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  if (existing.status !== 'active') throw new AppError('Customer is not active', 422, 'CUSTOMER_NOT_ACTIVE');

  const { reason, endDate } = body;
  const updated = await repo.softDelete(id, endDate);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer.deactivate', entityTable: 'customers', entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: 'inactive' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const linkUser = async (id, body, currentUser, context) => {
  const customer = await repo.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  const { userId, isPrimary } = body;
  const user = await repo.findUserById(userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (user.status !== 'active') throw new AppError('User is not active', 422, 'USER_NOT_ACTIVE');

  const userRoles = await repo.findUserRoleCodes(userId);
  if (!userRoles.includes('warga')) {
    throw new AppError('User must have Warga role to link with a customer', 422, 'USER_NOT_WARGA');
  }

  const result = await repo.linkUserAccount(id, userId, isPrimary);

  const userAccounts = await repo.findUserAccountsByCustomerId(id);

  if (!result.alreadyLinked) {
    await repo.createAuditLog({
      actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
      action: 'customer.link_user', entityTable: 'customers', entityId: id,
      newValues: { userId, isPrimary },
      ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
    });
  }

  return { ...customer, userAccounts };
};

const unlinkUser = async (id, body, currentUser, context) => {
  const customer = await repo.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  const { userId, reason } = body;
  const removed = await repo.unlinkUserAccount(id, userId);
  if (!removed) throw new AppError('User account link not found', 404, 'LINK_NOT_FOUND');

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'customer.unlink_user', entityTable: 'customers', entityId: id,
    oldValues: { userId }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  const userAccounts = await repo.findUserAccountsByCustomerId(id);
  return { ...customer, userAccounts };
};

const getBills = async (id, query, currentUser, userRoles) => {
  const customer = await repo.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, id);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const { bills, nextCursor } = await repo.findBillsByCustomerId(id, query);

  return {
    data: bills,
    pagination: { limit: query.limit, nextCursor, prevCursor: null }
  };
};

const getPayments = async (id, query, currentUser, userRoles) => {
  const customer = await repo.findById(id);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, id);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const { payments, nextCursor } = await repo.findPaymentsByCustomerId(id, query);

  return {
    data: payments,
    pagination: { limit: query.limit, nextCursor, prevCursor: null }
  };
};

module.exports = {
  getRequestContext, list, create, getById, update, deactivate,
  linkUser, unlinkUser, getBills, getPayments
};
