const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const isUuid = (value) => (
  typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
);

const mapUser = (row) => {
  if (!row) {
    return null;
  }

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
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const findUserByLogin = async (login) => {
  const result = await query(
    `
      SELECT
        id,
        username,
        email,
        phone_number,
        password_hash,
        full_name,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE deleted_at IS NULL
        AND (
          lower(username) = lower($1)
          OR lower(email) = lower($1)
        )
      LIMIT 1
    `,
    [login]
  );

  return mapUser(result.rows[0]);
};

const findUserById = async (userId) => {
  const result = await query(
    `
      SELECT
        id,
        username,
        email,
        phone_number,
        password_hash,
        full_name,
        status,
        last_login_at,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [userId]
  );

  return mapUser(result.rows[0]);
};

const findRoleCodesByUserId = async (userId) => {
  const result = await query(
    `
      SELECT r.code
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.code ASC
    `,
    [userId]
  );

  return result.rows.map((row) => row.code);
};

const findOfficerByUserId = async (userId) => {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        officer_number,
        full_name,
        phone_number,
        region_id,
        status,
        joined_date,
        created_at,
        updated_at
      FROM officers
      WHERE user_id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [userId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    officerNumber: row.officer_number,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    regionId: row.region_id,
    status: row.status,
    joinedDate: row.joined_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findCustomerAccountsByUserId = async (userId) => {
  const result = await query(
    `
      SELECT
        cua.customer_id,
        cua.user_id,
        cua.is_primary,
        c.customer_number,
        c.full_name,
        c.status,
        c.region_id,
        c.category_id
      FROM customer_user_accounts cua
      INNER JOIN customers c ON c.id = cua.customer_id
      WHERE cua.user_id = $1
        AND c.deleted_at IS NULL
      ORDER BY cua.is_primary DESC, c.customer_number ASC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    customerId: row.customer_id,
    userId: row.user_id,
    isPrimary: row.is_primary,
    customerNumber: row.customer_number,
    fullName: row.full_name,
    status: row.status,
    regionId: row.region_id,
    categoryId: row.category_id
  }));
};

const updateLastLoginAt = async (userId) => {
  await query(
    `
      UPDATE users
      SET last_login_at = now(),
          updated_at = now()
      WHERE id = $1
    `,
    [userId]
  );
};

const updatePasswordHash = async (userId, passwordHash) => {
  await query(
    `
      UPDATE users
      SET password_hash = $2,
          updated_at = now()
      WHERE id = $1
    `,
    [userId, passwordHash]
  );
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
    `
      INSERT INTO audit_logs (
        id,
        actor_user_id,
        actor_role_code,
        action,
        entity_table,
        entity_id,
        old_values,
        new_values,
        reason,
        ip_address,
        user_agent,
        request_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, now())
    `,
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
      isUuid(requestId) ? requestId : null
    ]
  );
};

module.exports = {
  findUserByLogin,
  findUserById,
  findRoleCodesByUserId,
  findOfficerByUserId,
  findCustomerAccountsByUserId,
  updateLastLoginAt,
  updatePasswordHash,
  createAuditLog,
  sanitizeUser
};
