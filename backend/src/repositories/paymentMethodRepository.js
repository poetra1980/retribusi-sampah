const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapMethod = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    requiresReferenceNumber: row.requires_reference_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async ({ status, limit, cursor, sort }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (status) { conditions.push(`pm.status = $${p}`); params.push(status); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (pm.code, pm.id) ${operator} ($${p}, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const sortField = sort && sort.startsWith('name') ? 'name' : 'code';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT pm.id, pm.code, pm.name, pm.description, pm.requires_reference_number, pm.status, pm.created_at, pm.updated_at
    FROM payment_methods pm
    ${whereClause} ${cursorCondition}
    ORDER BY pm.${sortField} ${sortDir}, pm.id ${sortDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.code}_${last.id}`;
  }

  return { methods: rows.map(mapMethod), nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, code, name, description, requires_reference_number, status, created_at, updated_at
     FROM payment_methods WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapMethod(result.rows[0]);
};

const findByCode = async (code, excludeId = null) => {
  const result = await query(
    `SELECT id FROM payment_methods WHERE code = $1${excludeId ? ' AND id != $2' : ''} LIMIT 1`,
    excludeId ? [code, excludeId] : [code]
  );

  return result.rows[0] || null;
};

const create = async (fields) => {
  const { id, code, name, description, requiresReferenceNumber, status } = fields;

  const result = await query(
    `INSERT INTO payment_methods (id, code, name, description, requires_reference_number, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())
     RETURNING id, code, name, description, requires_reference_number, status, created_at, updated_at`,
    [id, code, name, description || null, requiresReferenceNumber, status]
  );

  return mapMethod(result.rows[0]);
};

const update = async (id, fields) => {
  const fieldMap = { name: 'name', description: 'description', requiresReferenceNumber: 'requires_reference_number', status: 'status' };
  const setClauses = [];
  const params = [];
  let p = 1;

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${p}`);
      params.push(value);
      p++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push('updated_at = now()');
  params.push(id);

  const result = await query(
    `UPDATE payment_methods SET ${setClauses.join(', ')} WHERE id = $${p}
     RETURNING id, code, name, description, requires_reference_number, status, created_at, updated_at`,
    params
  );

  return mapMethod(result.rows[0]);
};

const deactivate = async (id) => {
  const result = await query(
    `UPDATE payment_methods SET status = 'inactive', updated_at = now() WHERE id = $1
     RETURNING id, code, name, description, requires_reference_number, status, created_at, updated_at`,
    [id]
  );

  return mapMethod(result.rows[0]);
};

const createAuditLog = async (props) => {
  await query(
    `INSERT INTO audit_logs (id, actor_user_id, actor_role_code, action, entity_table, entity_id, old_values, new_values, reason, ip_address, user_agent, request_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, now())`,
    [randomUUID(), props.actorUserId, props.actorRoleCode, props.action, props.entityTable, props.entityId,
     props.oldValues ? JSON.stringify(props.oldValues) : null, props.newValues ? JSON.stringify(props.newValues) : null,
     props.reason, props.ipAddress, props.userAgent, props.requestId]
  );
};

module.exports = { findAll, findById, findByCode, create, update, deactivate, createAuditLog };
