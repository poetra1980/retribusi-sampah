const { randomUUID } = require('crypto');

const officerRepository = require('../repositories/officerRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query) => {
  const { officers, nextCursor } = await officerRepository.findAll(query);

  return {
    data: officers,
    pagination: {
      limit: query.limit,
      nextCursor,
      prevCursor: null
    }
  };
};

const create = async (body, currentUser, context) => {
  const { userId, officerNumber, fullName, phoneNumber, regionId, status, joinedDate } = body;

  const user = await officerRepository.findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const existingOfficer = await officerRepository.findByUserId(userId);

  if (existingOfficer) {
    throw new AppError('User already has an officer profile', 409, 'OFFICER_EXISTS');
  }

  const existingNumber = await officerRepository.findByOfficerNumber(officerNumber);

  if (existingNumber) {
    throw new AppError('Officer number already exists', 409, 'DUPLICATE_OFFICER_NUMBER');
  }

  const region = await officerRepository.findRegionById(regionId);

  if (!region) {
    throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  const id = randomUUID();

  const rawOfficer = await officerRepository.create({
    id,
    userId,
    officerNumber,
    fullName,
    phoneNumber,
    regionId,
    status,
    joinedDate,
    createdBy: currentUser.id
  });

  await officerRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'officer.create',
    entityTable: 'officers',
    entityId: id,
    oldValues: null,
    newValues: {
      userId,
      officerNumber,
      fullName,
      phoneNumber,
      regionId,
      status,
      joinedDate
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  const officer = await officerRepository.findById(id);

  return officer;
};

const getById = async (id) => {
  const officer = await officerRepository.findById(id);

  if (!officer) {
    throw new AppError('Officer not found', 404, 'OFFICER_NOT_FOUND');
  }

  return officer;
};

const getByUserId = async (userId) => {
  const officer = await officerRepository.findByUserId(userId);

  if (!officer) {
    throw new AppError('Officer not found for this user', 404, 'OFFICER_NOT_FOUND');
  }

  return officer;
};

const update = async (id, body, currentUser, context) => {
  const existing = await officerRepository.findById(id);

  if (!existing) {
    throw new AppError('Officer not found', 404, 'OFFICER_NOT_FOUND');
  }

  const { fullName, phoneNumber, regionId, status, joinedDate } = body;

  const oldValues = {};
  const newValues = {};
  const updateFields = {};

  if (fullName !== undefined) {
    oldValues.fullName = existing.fullName;
    newValues.fullName = fullName;
    updateFields.fullName = fullName;
  }

  if (phoneNumber !== undefined) {
    oldValues.phoneNumber = existing.phoneNumber;
    newValues.phoneNumber = phoneNumber || null;
    updateFields.phoneNumber = phoneNumber;
  }

  if (regionId !== undefined) {
    const region = await officerRepository.findRegionById(regionId);

    if (!region) {
      throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
    }

    oldValues.regionId = existing.regionId;
    newValues.regionId = regionId;
    updateFields.regionId = regionId;
  }

  if (status !== undefined) {
    oldValues.status = existing.status;
    newValues.status = status;
    updateFields.status = status;
  }

  if (joinedDate !== undefined) {
    oldValues.joinedDate = existing.joinedDate;
    newValues.joinedDate = joinedDate;
    updateFields.joinedDate = joinedDate;
  }

  await officerRepository.update(id, updateFields);

  await officerRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'officer.update',
    entityTable: 'officers',
    entityId: id,
    oldValues,
    newValues,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return officerRepository.findById(id);
};

const deactivate = async (id, body, currentUser, context) => {
  const existing = await officerRepository.findById(id);

  if (!existing) {
    throw new AppError('Officer not found', 404, 'OFFICER_NOT_FOUND');
  }

  if (existing.status !== 'active') {
    throw new AppError('Officer is not active', 422, 'OFFICER_NOT_ACTIVE');
  }

  const { reason } = body;

  await officerRepository.deactivate(id);

  await officerRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'officer.deactivate',
    entityTable: 'officers',
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: 'inactive' },
    reason,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return officerRepository.findById(id);
};

const getPayments = async (id, query, currentUser, userRoles) => {
  const officer = await officerRepository.findById(id);
  if (!officer) throw new AppError('Officer not found', 404, 'OFFICER_NOT_FOUND');

  if (userRoles && userRoles.includes('petugas') && officer.userId !== currentUser.id) {
    throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const { payments, nextCursor } = await officerRepository.findPaymentsByOfficerId(id, query);

  return {
    data: payments,
    pagination: { limit: query.limit, nextCursor, prevCursor: null }
  };
};

module.exports = {
  getRequestContext,
  list,
  create,
  getById,
  getByUserId,
  update,
  deactivate,
  getPayments
};
