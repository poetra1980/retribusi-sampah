const authRepository = require('../repositories/authRepository');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { hashPassword, verifyPassword } = require('../utils/password');

const revokedRefreshTokenIds = new Set();

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => roles[0] || null;

const buildProfile = async (user) => {
  const roles = await authRepository.findRoleCodesByUserId(user.id);
  const [officer, customerAccounts] = await Promise.all([
    authRepository.findOfficerByUserId(user.id),
    authRepository.findCustomerAccountsByUserId(user.id)
  ]);

  return {
    user: authRepository.sanitizeUser(user),
    roles,
    officer,
    customerAccounts
  };
};

const assertActiveUser = (user) => {
  if (!user || user.status !== 'active') {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }
};

const login = async ({ username, email, password }, context) => {
  const loginValue = username || email;
  const user = await authRepository.findUserByLogin(loginValue);

  try {
    assertActiveUser(user);

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
  } catch (error) {
    await authRepository.createAuditLog({
      action: 'auth.login_failed',
      entityTable: 'users',
      entityId: user ? user.id : null,
      reason: 'Invalid credentials or inactive user',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId
    });

    throw error;
  }

  const profile = await buildProfile(user);
  const accessToken = signAccessToken(user, profile.roles);
  const refreshToken = signRefreshToken(user);

  await authRepository.updateLastLoginAt(user.id);
  await authRepository.createAuditLog({
    actorUserId: user.id,
    actorRoleCode: getPrimaryRole(profile.roles),
    action: 'auth.login',
    entityTable: 'users',
    entityId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: env.jwt.accessExpiresIn,
    ...profile
  };
};

const refreshToken = async ({ refreshToken: token }, context) => {
  const payload = verifyRefreshToken(token);

  if (revokedRefreshTokenIds.has(payload.jti)) {
    throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
  }

  const user = await authRepository.findUserById(payload.sub);

  if (!user || user.status !== 'active') {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const profile = await buildProfile(user);
  const accessToken = signAccessToken(user, profile.roles);

  await authRepository.createAuditLog({
    actorUserId: user.id,
    actorRoleCode: getPrimaryRole(profile.roles),
    action: 'auth.refresh_token',
    entityTable: 'users',
    entityId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return {
    accessToken,
    expiresIn: env.jwt.accessExpiresIn
  };
};

const logout = async ({ refreshToken: token }, currentUser, context) => {
  const payload = verifyRefreshToken(token);

  revokedRefreshTokenIds.add(payload.jti);

  const actorUserId = currentUser ? currentUser.id : payload.sub;
  const roles = actorUserId ? await authRepository.findRoleCodesByUserId(actorUserId) : [];

  await authRepository.createAuditLog({
    actorUserId,
    actorRoleCode: getPrimaryRole(roles),
    action: 'auth.logout',
    entityTable: 'users',
    entityId: actorUserId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return {
    message: 'Logout successful'
  };
};

const getCurrentUserProfile = async (userId) => {
  const user = await authRepository.findUserById(userId);

  if (!user || user.status !== 'active') {
    throw new AppError('User is not active', 401, 'USER_NOT_ACTIVE');
  }

  return buildProfile(user);
};

const changePassword = async ({ currentPassword, newPassword }, currentUser, context) => {
  const user = await authRepository.findUserById(currentUser.id);

  if (!user || user.status !== 'active') {
    throw new AppError('User is not active', 401, 'USER_NOT_ACTIVE');
  }

  const passwordMatches = await verifyPassword(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Current password is invalid', 422, 'INVALID_CURRENT_PASSWORD');
  }

  const samePassword = await verifyPassword(newPassword, user.passwordHash);

  if (samePassword) {
    throw new AppError('New password must be different from current password', 422, 'PASSWORD_REUSED');
  }

  const newPasswordHash = await hashPassword(newPassword);
  await authRepository.updatePasswordHash(user.id, newPasswordHash);

  const roles = await authRepository.findRoleCodesByUserId(user.id);

  await authRepository.createAuditLog({
    actorUserId: user.id,
    actorRoleCode: getPrimaryRole(roles),
    action: 'auth.change_password',
    entityTable: 'users',
    entityId: user.id,
    reason: 'User changed own password',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return {
    message: 'Password changed successfully'
  };
};

module.exports = {
  getRequestContext,
  login,
  refreshToken,
  logout,
  getCurrentUserProfile,
  changePassword
};
