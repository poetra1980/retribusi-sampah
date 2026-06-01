const roleRepository = require('../repositories/roleRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async () => {
  const roles = await roleRepository.findAll();

  return { data: roles };
};

const getById = async (roleId) => {
  const role = await roleRepository.findById(roleId);

  if (!role) {
    throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
  }

  return role;
};

const updateUserRoles = async (userId, body, currentUser, context) => {
  const user = await roleRepository.findUserById(userId);

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const { roleIds } = body;

  for (const roleId of roleIds) {
    const role = await roleRepository.findById(roleId);

    if (!role) {
      throw new AppError(`Role with ID ${roleId} not found`, 404, 'ROLE_NOT_FOUND');
    }
  }

  const oldRoles = await roleRepository.findRolesByUserId(userId);
  const oldRoleCodes = oldRoles.map((r) => r.code);

  await roleRepository.replaceUserRoles(userId, roleIds);

  const newRoles = await roleRepository.findRolesByUserId(userId);
  const newRoleCodes = newRoles.map((r) => r.code);

  await roleRepository.createAuditLog({
    actorUserId: currentUser.id,
    actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'user.roles_updated',
    entityTable: 'users',
    entityId: userId,
    oldValues: { roles: oldRoleCodes },
    newValues: { roles: newRoleCodes },
    reason: 'Admin updated user roles',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId
  });

  return { ...roleRepository.sanitizeUser(user), roles: newRoles };
};

module.exports = {
  getRequestContext,
  list,
  getById,
  updateUserRoles
};
