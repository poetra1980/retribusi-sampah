const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapCategory = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async ({ q, status, limit, cursor, sort }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(lower(cc.name) LIKE lower($${paramIndex}) OR lower(cc.code) LIKE lower($${paramIndex}))`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (status) {
    conditions.push(`cc.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorCode, cursorId] = cursor.split('_');
    if (cursorCode && cursorId) {
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (cc.code, cc.id) ${operator} ($${paramIndex}, $${paramIndex + 1}::uuid)`;
      params.push(cursorCode, cursorId);
      paramIndex += 2;
    }
  }

  const sortField = sort && sort.startsWith('name') ? 'name' : 'code';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
  const orderBy = `ORDER BY cc.${sortField} ${sortDir}, cc.id ${sortDir}`;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT cc.id, cc.code, cc.name, cc.description, cc.status, cc.created_at, cc.updated_at
    FROM customer_categories cc
    ${whereClause}
    ${cursorCondition}
    ${orderBy}
    LIMIT $${paramIndex}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const categories = rows.map(mapCategory);

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.code}_${last.id}`;
  }

  return { categories, nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, code, name, description, status, created_at, updated_at
     FROM customer_categories WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapCategory(result.rows[0]);
};

const findByCode = async (code, excludeId = null) => {
  const result = await query(
    `SELECT id FROM customer_categories WHERE code = $1${excludeId ? ' AND id != $2' : ''} LIMIT 1`,
    excludeId ? [code, excludeId] : [code]
  );

  return result.rows[0] || null;
};

const create = async ({ id, code, name, description, status }) => {
  const result = await query(
    `INSERT INTO customer_categories (id, code, name, description, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     RETURNING id, code, name, description, status, created_at, updated_at`,
    [id, code, name, description || null, status]
  );

  return mapCategory(result.rows[0]);
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  const fieldMap = { code: 'code', name: 'name', description: 'description', status: 'status' };

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${paramIndex}`);
      params.push(value === '' ? null : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push('updated_at = now()');
  params.push(id);

  const result = await query(
    `UPDATE customer_categories SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
     RETURNING id, code, name, description, status, created_at, updated_at`,
    params
  );

  return mapCategory(result.rows[0]);
};

const deactivate = async (id) => {
  const result = await query(
    `UPDATE customer_categories SET status = 'inactive', updated_at = now() WHERE id = $1
     RETURNING id, code, name, description, status, created_at, updated_at`,
    [id]
  );

  return mapCategory(result.rows[0]);
};

const hasActiveCustomers = async (categoryId) => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM customers WHERE category_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [categoryId]
  );

  return parseInt(result.rows[0].cnt, 10) > 0;
};

const createAuditLog = async ({
  actorUserId, actorRoleCode, action, entityTable, entityId,
  oldValues, newValues, reason, ipAddress, userAgent, requestId
}) => {
  await query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_role_code, action, entity_table, entity_id, old_values, new_values, reason, ip_address, user_agent, request_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, now())`,
    [randomUUID(), actorUserId, actorRoleCode, action, entityTable, entityId,
     oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null,
     reason, ipAddress, userAgent, requestId]
  );
};

module.exports = {
  findAll, findById, findByCode, create, update, deactivate,
  hasActiveCustomers, createAuditLog
};
