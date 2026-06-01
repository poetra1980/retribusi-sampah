const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapRole = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    createdAt: row.created_at
  };
};

const findAll = async () => {
  const result = await query(
    `SELECT id, code, name, description, created_at
     FROM roles
     ORDER BY code ASC`
  );

  return result.rows.map(mapRole);
};

const findById = async (roleId) => {
  const result = await query(
    `SELECT id, code, name, description, created_at
     FROM roles
     WHERE id = $1
     LIMIT 1`,
    [roleId]
  );

  return mapRole(result.rows[0]);
};

const findRolesByUserId = async (userId) => {
  const result = await query(
    `SELECT r.id, r.code, r.name
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY r.code ASC`,
    [userId]
  );

  return result.rows;
};

const replaceUserRoles = async (userId, roleIds) => {
  await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

  if (roleIds.length > 0) {
    const values = roleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    const params = [userId, ...roleIds];

    await query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ${values}`,
      params
    );
  }
};

const findUserById = async (userId) => {
  const result = await query(
    `SELECT
       id, username, email, phone_number, password_hash,
       full_name, status, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const sanitizeUser = (user) => {
  if (!user) return null;

  const { password_hash, ...safeUser } = user;
  return safeUser;
};

const createAuditLog = async ({
  actorUserId = null,
  actorRoleCode = null,
  action,
  entityTable,
  entityId = null,
  oldValues = null,
  newValues = null,
  reason = null,
  ipAddress = null,
  userAgent = null,
  requestId = null
}) => {
  await query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_role_code, action, entity_table, entity_id, old_values, new_values, reason, ip_address, user_agent, request_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, now())`,
    [
      randomUUID(),
      actorUserId,
      actorRoleCode,
      action,
      entityTable,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason,
      ipAddress,
      userAgent,
      requestId
    ]
  );
};

module.exports = {
  findAll,
  findById,
  findRolesByUserId,
  replaceUserRoles,
  findUserById,
  sanitizeUser,
  createAuditLog
};
