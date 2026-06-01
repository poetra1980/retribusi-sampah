const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapUser = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phoneNumber: row.phone_number,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const sanitizeUser = (user) => {
  if (!user) return null;

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const findByUsername = async (username) => {
  const result = await query(
    `SELECT id FROM users WHERE lower(username) = lower($1) AND deleted_at IS NULL LIMIT 1`,
    [username]
  );

  return result.rows[0] || null;
};

const findByEmail = async (email) => {
  if (!email) return null;

  const result = await query(
    `SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

const findByPhone = async (phoneNumber) => {
  if (!phoneNumber) return null;

  const result = await query(
    `SELECT id FROM users WHERE phone_number = $1 AND deleted_at IS NULL LIMIT 1`,
    [phoneNumber]
  );

  return result.rows[0] || null;
};

const findById = async (userId) => {
  const result = await query(
    `SELECT
       id, username, email, phone_number, password_hash,
       full_name, status, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return mapUser(result.rows[0]);
};

const findAll = async ({ q, status, role, limit, cursor, sort }) => {
  const conditions = ['u.deleted_at IS NULL'];
  const params = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(lower(u.full_name) LIKE lower($${paramIndex}) OR lower(u.username) LIKE lower($${paramIndex}) OR lower(u.email) LIKE lower($${paramIndex}))`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (status) {
    conditions.push(`u.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (role) {
    conditions.push(`EXISTS (SELECT 1 FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.code = $${paramIndex})`);
    params.push(role);
    paramIndex++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorCreatedAt, cursorId] = cursor.split('_');
    if (cursorCreatedAt && cursorId) {
      const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (u.created_at, u.id) ${operator} ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`;
      params.push(cursorCreatedAt, cursorId);
      paramIndex += 2;
    }
  }

  const sortField = 'created_at';
  const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
  const orderBy = `ORDER BY u.${sortField} ${sortDir}, u.id ${sortDir}`;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      u.id, u.username, u.email, u.phone_number, u.full_name,
      u.status, u.last_login_at, u.created_at, u.updated_at,
      COALESCE(
        json_agg(json_build_object('id', r.id, 'code', r.code, 'name', r.name))
        FILTER (WHERE r.id IS NOT NULL),
        '[]'::json
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    ${whereClause}
    GROUP BY u.id, u.username, u.email, u.phone_number, u.full_name,
             u.status, u.last_login_at, u.created_at, u.updated_at
    ${orderBy}
    LIMIT $${paramIndex}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const users = rows.map((row) => {
    const { password_hash, ...safe } = row;
    return {
      id: safe.id,
      username: safe.username,
      email: safe.email,
      phoneNumber: safe.phone_number,
      fullName: safe.full_name,
      status: safe.status,
      roles: safe.roles,
      lastLoginAt: safe.last_login_at,
      createdAt: safe.created_at,
      updatedAt: safe.updated_at
    };
  });

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { users, nextCursor };
};

const create = async ({
  id, username, email, phoneNumber, passwordHash, fullName, status
}) => {
  const result = await query(
    `INSERT INTO users (id, username, email, phone_number, password_hash, full_name, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
     RETURNING
       id, username, email, phone_number, full_name,
       status, last_login_at, created_at, updated_at`,
    [id, username, email || null, phoneNumber || null, passwordHash, fullName, status]
  );

  return result.rows[0];
};

const update = async (userId, fields) => {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  const fieldMap = {
    email: 'email',
    phoneNumber: 'phone_number',
    fullName: 'full_name',
    status: 'status'
  };

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${paramIndex}`);
      params.push(value === '' ? null : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = now()`);
  params.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING
       id, username, email, phone_number, full_name,
       status, last_login_at, created_at, updated_at`,
    params
  );

  return result.rows[0] || null;
};

const deactivate = async (userId) => {
  const result = await query(
    `UPDATE users
     SET status = 'inactive', updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING
       id, username, email, phone_number, full_name,
       status, last_login_at, created_at, updated_at`,
    [userId]
  );

  return result.rows[0] || null;
};

const updatePasswordHash = async (userId, passwordHash) => {
  await query(
    `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
    [userId, passwordHash]
  );
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
    const values = roleIds.map((roleId, i) => `($1, $${i + 2})`).join(', ');
    const params = [userId, ...roleIds];

    await query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ${values}`,
      params
    );
  }
};

const countAdminUsers = async () => {
  const result = await query(
    `SELECT COUNT(*) AS cnt
     FROM users u
     INNER JOIN user_roles ur ON ur.user_id = u.id
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE r.code = 'admin'
       AND u.status = 'active'
       AND u.deleted_at IS NULL`
  );

  return parseInt(result.rows[0].cnt, 10);
};

const findRoleById = async (roleId) => {
  const result = await query(
    `SELECT id, code, name FROM roles WHERE id = $1 LIMIT 1`,
    [roleId]
  );

  return result.rows[0] || null;
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
  findByUsername,
  findByEmail,
  findByPhone,
  findById,
  findAll,
  create,
  update,
  deactivate,
  updatePasswordHash,
  findRolesByUserId,
  replaceUserRoles,
  countAdminUsers,
  findRoleById,
  createAuditLog,
  sanitizeUser
};
