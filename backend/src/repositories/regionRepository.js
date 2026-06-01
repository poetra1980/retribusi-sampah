const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapRegion = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    parentId: row.parent_id,
    code: row.code,
    name: row.name,
    level: row.level,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async ({ q, parentId, level, status, limit, cursor, sort }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(lower(r.name) LIKE lower($${paramIndex}) OR lower(r.code) LIKE lower($${paramIndex}))`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (parentId !== undefined) {
    if (parentId === null) {
      conditions.push(`r.parent_id IS NULL`);
    } else {
      conditions.push(`r.parent_id = $${paramIndex}`);
      params.push(parentId);
      paramIndex++;
    }
  }

  if (level) {
    conditions.push(`r.level = $${paramIndex}`);
    params.push(level);
    paramIndex++;
  }

  if (status) {
    conditions.push(`r.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorCode, cursorId] = cursor.split('_');
    if (cursorCode && cursorId) {
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (r.code, r.id) ${operator} ($${paramIndex}, $${paramIndex + 1}::uuid)`;
      params.push(cursorCode, cursorId);
      paramIndex += 2;
    }
  }

  const sortField = sort && sort.startsWith('name') ? 'name' : 'code';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
  const orderBy = `ORDER BY r.${sortField} ${sortDir}, r.id ${sortDir}`;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT r.id, r.parent_id, r.code, r.name, r.level, r.status, r.created_at, r.updated_at
    FROM regions r
    ${whereClause}
    ${cursorCondition}
    ${orderBy}
    LIMIT $${paramIndex}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const regions = rows.map(mapRegion);

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.code}_${last.id}`;
  }

  return { regions, nextCursor };
};

const findTree = async ({ status, level } = {}) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`r.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (level) {
    conditions.push(`r.level = $${paramIndex}`);
    params.push(level);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT r.id, r.parent_id, r.code, r.name, r.level, r.status, r.created_at, r.updated_at
     FROM regions r
     ${whereClause}
     ORDER BY r.code ASC`,
    params
  );

  return result.rows.map(mapRegion);
};

const findById = async (regionId) => {
  const result = await query(
    `SELECT id, parent_id, code, name, level, status, created_at, updated_at
     FROM regions
     WHERE id = $1
     LIMIT 1`,
    [regionId]
  );

  return mapRegion(result.rows[0]);
};

const findByCode = async (code, excludeId = null) => {
  const result = await query(
    `SELECT id FROM regions WHERE code = $1${excludeId ? ' AND id != $2' : ''} LIMIT 1`,
    excludeId ? [code, excludeId] : [code]
  );

  return result.rows[0] || null;
};

const create = async ({ id, parentId, code, name, level, status }) => {
  const result = await query(
    `INSERT INTO regions (id, parent_id, code, name, level, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())
     RETURNING id, parent_id, code, name, level, status, created_at, updated_at`,
    [id, parentId || null, code, name, level, status]
  );

  return mapRegion(result.rows[0]);
};

const update = async (regionId, fields) => {
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  const fieldMap = {
    parentId: 'parent_id',
    code: 'code',
    name: 'name',
    level: 'level',
    status: 'status'
  };

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${paramIndex}`);
      params.push(value === null && column === 'parent_id' ? null : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push('updated_at = now()');
  params.push(regionId);

  const result = await query(
    `UPDATE regions SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, parent_id, code, name, level, status, created_at, updated_at`,
    params
  );

  return mapRegion(result.rows[0]);
};

const deactivate = async (regionId) => {
  const result = await query(
    `UPDATE regions SET status = 'inactive', updated_at = now()
     WHERE id = $1
     RETURNING id, parent_id, code, name, level, status, created_at, updated_at`,
    [regionId]
  );

  return mapRegion(result.rows[0]);
};

const hasActiveCustomers = async (regionId) => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM customers WHERE region_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [regionId]
  );

  return parseInt(result.rows[0].cnt, 10) > 0;
};

const hasActiveOfficers = async (regionId) => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM officers WHERE region_id = $1 AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [regionId]
  );

  return parseInt(result.rows[0].cnt, 10) > 0;
};

const hasActiveChildren = async (regionId) => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM regions WHERE parent_id = $1 AND status = 'active' LIMIT 1`,
    [regionId]
  );

  return parseInt(result.rows[0].cnt, 10) > 0;
};

const isParentCycle = async (regionId, newParentId) => {
  let currentId = newParentId;

  while (currentId) {
    if (currentId === regionId) return true;

    const result = await query(
      `SELECT parent_id FROM regions WHERE id = $1 LIMIT 1`,
      [currentId]
    );

    if (!result.rows[0]) break;
    currentId = result.rows[0].parent_id;
  }

  return false;
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
  findTree,
  findById,
  findByCode,
  create,
  update,
  deactivate,
  hasActiveCustomers,
  hasActiveOfficers,
  hasActiveChildren,
  isParentCycle,
  createAuditLog
};
