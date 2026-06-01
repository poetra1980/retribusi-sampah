const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapPayment = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    paymentNumber: row.payment_number,
    customerId: row.customer_id,
    amount: row.amount,
    paymentAt: row.payment_at,
    status: row.status,
    customerName: row.customer_name,
    customerNumber: row.customer_number,
    paymentMethodName: row.payment_method_name
  };
};

const mapOfficer = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    officerNumber: row.officer_number,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    regionId: row.region_id,
    region: row.region_name ? { id: row.region_id, name: row.region_name } : null,
    status: row.status,
    joinedDate: row.joined_date,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async ({ q, regionId, status, limit, cursor, sort }) => {
  const conditions = ['o.deleted_at IS NULL'];
  const params = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(lower(o.full_name) LIKE lower($${paramIndex}) OR lower(o.officer_number) LIKE lower($${paramIndex}))`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (regionId) {
    conditions.push(`o.region_id = $${paramIndex}`);
    params.push(regionId);
    paramIndex++;
  }

  if (status) {
    conditions.push(`o.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorValue, cursorId] = cursor.split('_');
    if (cursorValue && cursorId) {
      const sortField = sort && sort.startsWith('fullName') ? 'full_name' : 'officer_number';
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (o.${sortField}, o.id) ${operator} ($${paramIndex}, $${paramIndex + 1}::uuid)`;
      params.push(cursorValue, cursorId);
      paramIndex += 2;
    }
  }

  const sortField = sort && sort.startsWith('fullName') ? 'full_name' : sort && sort.startsWith('createdAt') ? 'created_at' : 'officer_number';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
  const orderBy = `ORDER BY o.${sortField} ${sortDir}, o.id ${sortDir}`;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT o.id, o.user_id, o.officer_number, o.full_name, o.phone_number,
           o.region_id, r.name AS region_name,
           o.status, o.joined_date,
           o.created_by, o.updated_by,
           o.created_at, o.updated_at
    FROM officers o
    LEFT JOIN regions r ON r.id = o.region_id
    ${whereClause}
    ${cursorCondition}
    ${orderBy}
    LIMIT $${paramIndex}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const officers = rows.map(mapOfficer);

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    const cursorField = sort && sort.startsWith('fullName') ? last.full_name : last.officer_number;
    nextCursor = `${cursorField}_${last.id}`;
  }

  return { officers, nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT o.id, o.user_id, o.officer_number, o.full_name, o.phone_number,
            o.region_id, r.name AS region_name,
            o.status, o.joined_date,
            o.created_by, o.updated_by,
            o.created_at, o.updated_at
     FROM officers o
     LEFT JOIN regions r ON r.id = o.region_id
     WHERE o.id = $1 AND o.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  return mapOfficer(result.rows[0]);
};

const findByUserId = async (userId) => {
  const result = await query(
    `SELECT o.id, o.user_id, o.officer_number, o.full_name, o.phone_number,
            o.region_id, r.name AS region_name,
            o.status, o.joined_date,
            o.created_by, o.updated_by,
            o.created_at, o.updated_at
     FROM officers o
     LEFT JOIN regions r ON r.id = o.region_id
     WHERE o.user_id = $1 AND o.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return mapOfficer(result.rows[0]);
};

const findByOfficerNumber = async (officerNumber) => {
  const result = await query(
    `SELECT id FROM officers WHERE officer_number = $1 AND deleted_at IS NULL LIMIT 1`,
    [officerNumber]
  );

  return result.rows[0] || null;
};

const findUserById = async (userId) => {
  const result = await query(
    `SELECT id, username, email, full_name, status
     FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const findRegionById = async (regionId) => {
  const result = await query(
    `SELECT id, name FROM regions WHERE id = $1 LIMIT 1`,
    [regionId]
  );

  return result.rows[0] || null;
};

const create = async ({
  id, userId, officerNumber, fullName, phoneNumber,
  regionId, status, joinedDate, createdBy
}) => {
  const result = await query(
    `INSERT INTO officers (id, user_id, officer_number, full_name, phone_number,
                           region_id, status, joined_date, created_by,
                           created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
     RETURNING
       id, user_id, officer_number, full_name, phone_number,
       region_id, status, joined_date,
       created_by, updated_by, created_at, updated_at`,
    [id, userId, officerNumber, fullName, phoneNumber || null, regionId, status, joinedDate, createdBy]
  );

  return result.rows[0];
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  const fieldMap = {
    fullName: 'full_name',
    phoneNumber: 'phone_number',
    regionId: 'region_id',
    status: 'status',
    joinedDate: 'joined_date'
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
  params.push(id);

  const result = await query(
    `UPDATE officers SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex} AND deleted_at IS NULL
     RETURNING
       id, user_id, officer_number, full_name, phone_number,
       region_id, status, joined_date,
       created_by, updated_by, created_at, updated_at`,
    params
  );

  return result.rows[0] || null;
};

const deactivate = async (id) => {
  const result = await query(
    `UPDATE officers
     SET status = 'inactive', updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING
       id, user_id, officer_number, full_name, phone_number,
       region_id, status, joined_date,
       created_by, updated_by, created_at, updated_at`,
    [id]
  );

  return result.rows[0] || null;
};

const findPaymentsByOfficerId = async (officerId, { dateFrom, dateTo, paymentMethodId, limit, cursor }) => {
  const conditions = ['p.officer_id = $1'];
  const params = [officerId];
  let p = 2;

  if (dateFrom) { conditions.push(`p.payment_at >= $${p}::timestamptz`); params.push(dateFrom); p++; }
  if (dateTo) { conditions.push(`p.payment_at <= $${p}::timestamptz`); params.push(dateTo); p++; }
  if (paymentMethodId) { conditions.push(`p.payment_method_id = $${p}`); params.push(paymentMethodId); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (p.payment_at, p.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const queryStr = `
    SELECT p.id, p.payment_number, p.amount, p.payment_at, p.status,
           c.full_name AS customer_name, c.customer_number,
           pm.name AS payment_method_name
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY p.payment_at DESC, p.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(queryStr, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.payment_at.toISOString()}_${last.id}`;
  }

  return { payments: rows.map(mapPayment), nextCursor };
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
  findByUserId,
  findByOfficerNumber,
  findUserById,
  findRegionById,
  create,
  update,
  deactivate,
  findPaymentsByOfficerId,
  createAuditLog
};
