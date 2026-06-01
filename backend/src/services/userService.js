const { randomUUID } = require('crypto');

const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/AppError');
const { hashPassword } = require('../utils/password');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const assertUniqueConstraints = async ({ username, email, phoneNumber, excludeUserId = null }) => {
  if (username) {
    const existing = await userRepository.findByUsername(username);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError('Username already exists', 409, 'DUPLICATE_USERNAME');
    }
  }

  if (email) {
    const existing = await userRepository.findByEmail(email);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError('Email already exists', 409, 'DUPLICATE_EMAIL');
    }
  }

  if (phoneNumber) {
    const existing = await userRepository.findByPhone(phoneNumber);
    if (existing && existing.id !== excludeUserId) {
      throw new AppError('Phone number already exists', 409, 'DUPLICATE_PHONE');
    }
  }
};

const validateRoleIds = async (roleIds) => {
  for (const roleId of roleIds) {
    const role = await userRepository.findRoleById(roleId);
    if (!role) {
      throw new AppError(`Role with ID ${roleId} not found`, 404, 'ROLE_NOT_FOUND');
    }
  }
};

const list = async (query) => {
  const { users, nextCursor } = await userRepository.findAll(query);

  return {
    data: users.map((u) => {
      const { password_hash, ...safe } = u;
      return safe;
    }),
    pagination: {
      limit: query.limit,
      nextCursor,
      prevCursor: null
    }
  };
};

const create = async (body, currentUser, context) => {
  const { username, email, phoneNumber, password, fullName, status, roleIds } = body;

  await assertUniqueConstraints({ username, email, phoneNumber });
  await validateRoleIds(roleIds);

  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  const rawUser = await userRepository.create({
    id,
    username,
    email,
    phoneNumber,
    passwordHash,
    fullName,
    status
  });

  await userRepository.replaceUserRoles(id, roleIds);

  const roles = await userRepository.findRolesByUserId(id);

  await userRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'user.create',
    entityTable: 'users',
    entityId: id,
    oldValues: null,
    newValues: {
      username: rawUser.username,
      email: rawUser.email,
      phoneNumber: rawUser.phone_number,
      fullName: rawUser.full_name,
      status: rawUser.status,
      roles: roles.map((r) => r.code)
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return { ...userRepository.sanitizeUser({
    ...rawUser,
    passwordHash: null
  }), roles };
};

const getById = async (userId) => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const roles = await userRepository.findRolesByUserId(userId);

  return { ...userRepository.sanitizeUser(user), roles };
};

const update = async (userId, body, currentUser, context) => {
  const existing = await userRepository.findById(userId);

  if (!existing) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const { email, phoneNumber, fullName, status, roleIds } = body;

  await assertUniqueConstraints({
    email: email !== undefined ? email : undefined,
    phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
    excludeUserId: userId
  });

  const oldValues = {};
  const newValues = {};

  const updateFields = {};
  if (email !== undefined) {
    oldValues.email = existing.email;
    newValues.email = email || null;
    updateFields.email = email;
  }
  if (phoneNumber !== undefined) {
    oldValues.phoneNumber = existing.phoneNumber;
    newValues.phoneNumber = phoneNumber || null;
    updateFields.phoneNumber = phoneNumber;
  }
  if (fullName !== undefined) {
    oldValues.fullName = existing.fullName;
    newValues.fullName = fullName;
    updateFields.fullName = fullName;
  }
  if (status !== undefined) {
    oldValues.status = existing.status;
    newValues.status = status;
    updateFields.status = status;
  }

  const updated = await userRepository.update(userId, updateFields);

  if (roleIds !== undefined) {
    await validateRoleIds(roleIds);
    const oldRoles = await userRepository.findRolesByUserId(userId);
    oldValues.roles = oldRoles.map((r) => r.code);
    newValues.roles = roleIds;

    await userRepository.replaceUserRoles(userId, roleIds);
  }

  const roles = await userRepository.findRolesByUserId(userId);

  await userRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'user.update',
    entityTable: 'users',
    entityId: userId,
    oldValues,
    newValues,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return { ...userRepository.sanitizeUser({
    ...updated,
    passwordHash: null
  }), roles };
};

const deactivate = async (userId, body, currentUser, context) => {
  const existing = await userRepository.findById(userId);

  if (!existing) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (existing.status !== 'active') {
    throw new AppError('User is not active', 422, 'USER_NOT_ACTIVE');
  }

  if (userId === currentUser.id) {
    const adminCount = await userRepository.countAdminUsers();

    if (adminCount <= 1) {
      throw new AppError(
        'Cannot deactivate your own account as the only active admin',
        422,
        'LAST_ADMIN_DEACTIVATE'
      );
    }
  }

  const { reason } = body;
  const updated = await userRepository.deactivate(userId);
  const roles = await userRepository.findRolesByUserId(userId);

  await userRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'user.deactivate',
    entityTable: 'users',
    entityId: userId,
    oldValues: { status: existing.status },
    newValues: { status: 'inactive' },
    reason,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return { ...userRepository.sanitizeUser({
    ...updated,
    passwordHash: null
  }), roles };
};

const resetPassword = async (userId, body, currentUser, context) => {
  const existing = await userRepository.findById(userId);

  if (!existing) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const { newPassword } = body;
  const passwordHash = await hashPassword(newPassword);

  await userRepository.updatePasswordHash(userId, passwordHash);
  const roles = await userRepository.findRolesByUserId(userId);

  await userRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'user.reset_password',
    entityTable: 'users',
    entityId: userId,
    reason: 'Admin reset user password',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return { message: 'Password reset successfully' };
};

module.exports = {
  getRequestContext,
  list,
  create,
  getById,
  update,
  deactivate,
  resetPassword
};
