const { randomUUID } = require('crypto');

const regionRepository = require('../repositories/regionRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const buildTree = (regions, parentId = null) => {
  return regions
    .filter((r) => r.parentId === parentId)
    .map((r) => ({
      ...r,
      children: buildTree(regions, r.id)
    }));
};

const list = async (query, currentUser, context) => {
  const { regions, nextCursor } = await regionRepository.findAll(query);

  return {
    data: regions,
    pagination: {
      limit: query.limit,
      nextCursor,
      prevCursor: null
    }
  };
};

const getTree = async (query) => {
  const regions = await regionRepository.findTree(query);
  const tree = buildTree(regions);

  return { data: tree };
};

const create = async (body, currentUser, context) => {
  const { parentId, code, name, level, status } = body;

  const existing = await regionRepository.findByCode(code);

  if (existing) {
    throw new AppError('Region code already exists', 409, 'DUPLICATE_CODE');
  }

  if (parentId) {
    const parent = await regionRepository.findById(parentId);

    if (!parent) {
      throw new AppError('Parent region not found', 404, 'PARENT_NOT_FOUND');
    }
  }

  const id = randomUUID();
  const region = await regionRepository.create({ id, parentId, code, name, level, status });

  await regionRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'region.create',
    entityTable: 'regions',
    entityId: id,
    newValues: { code, name, level, status, parentId },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return region;
};

const getById = async (regionId) => {
  const region = await regionRepository.findById(regionId);

  if (!region) {
    throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  return region;
};

const update = async (regionId, body, currentUser, context) => {
  const existing = await regionRepository.findById(regionId);

  if (!existing) {
    throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  const { parentId, code, name, level, status } = body;

  if (code !== undefined && code !== existing.code) {
    const dup = await regionRepository.findByCode(code);

    if (dup) {
      throw new AppError('Region code already exists', 409, 'DUPLICATE_CODE');
    }
  }

  if (parentId !== undefined) {
    if (parentId === regionId) {
      throw new AppError('Region cannot be its own parent', 422, 'SELF_PARENT');
    }

    if (parentId) {
      const parent = await regionRepository.findById(parentId);

      if (!parent) {
        throw new AppError('Parent region not found', 404, 'PARENT_NOT_FOUND');
      }

      const wouldCycle = await regionRepository.isParentCycle(regionId, parentId);

      if (wouldCycle) {
        throw new AppError('Setting this parent would create a circular reference', 422, 'CYCLE_DETECTED');
      }
    }
  }

  const oldValues = { code: existing.code, name: existing.name, level: existing.level, status: existing.status, parentId: existing.parentId };
  const newValues = {};

  const updateFields = {};
  if (parentId !== undefined) { updateFields.parentId = parentId; newValues.parentId = parentId; }
  if (code !== undefined) { updateFields.code = code; newValues.code = code; }
  if (name !== undefined) { updateFields.name = name; newValues.name = name; }
  if (level !== undefined) { updateFields.level = level; newValues.level = level; }
  if (status !== undefined) { updateFields.status = status; newValues.status = status; }

  const updated = await regionRepository.update(regionId, updateFields);

  await regionRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'region.update',
    entityTable: 'regions',
    entityId: regionId,
    oldValues,
    newValues,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return updated;
};

const deactivate = async (regionId, body, currentUser, context) => {
  const existing = await regionRepository.findById(regionId);

  if (!existing) {
    throw new AppError('Region not found', 404, 'REGION_NOT_FOUND');
  }

  if (existing.status !== 'active') {
    throw new AppError('Region is not active', 422, 'REGION_NOT_ACTIVE');
  }

  const [hasCustomers, hasOfficers, hasChildren] = await Promise.all([
    regionRepository.hasActiveCustomers(regionId),
    regionRepository.hasActiveOfficers(regionId),
    regionRepository.hasActiveChildren(regionId)
  ]);

  if (hasCustomers) {
    throw new AppError(
      'Cannot deactivate region with active customers. Migrate customers first.',
      422,
      'REGION_HAS_ACTIVE_CUSTOMERS'
    );
  }

  if (hasOfficers) {
    throw new AppError(
      'Cannot deactivate region with active officers. Migrate officers first.',
      422,
      'REGION_HAS_ACTIVE_OFFICERS'
    );
  }

  if (hasChildren) {
    throw new AppError(
      'Cannot deactivate region with active child regions. Deactivate children first.',
      422,
      'REGION_HAS_ACTIVE_CHILDREN'
    );
  }

  const { reason } = body;
  const updated = await regionRepository.deactivate(regionId);

  await regionRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'region.deactivate',
    entityTable: 'regions',
    entityId: regionId,
    oldValues: { status: existing.status },
    newValues: { status: 'inactive' },
    reason,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return updated;
};

module.exports = {
  getRequestContext,
  list,
  getTree,
  create,
  getById,
  update,
  deactivate
};
