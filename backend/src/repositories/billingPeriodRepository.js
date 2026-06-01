const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapPeriod = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    year: row.year,
    month: row.month,
    periodCode: row.period_code,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async ({ year, month, status, limit, cursor, sort }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (year) { conditions.push(`bp.year = $${p}`); params.push(year); p++; }
  if (month) { conditions.push(`bp.month = $${p}`); params.push(month); p++; }
  if (status) { conditions.push(`bp.status = $${p}`); params.push(status); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (bp.period_code, bp.id) ${operator} ($${p}, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const sortField = 'period_code';
  const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT bp.id, bp.year, bp.month, bp.period_code, bp.start_date, bp.end_date, bp.status, bp.created_at, bp.updated_at
    FROM billing_periods bp
    ${whereClause} ${cursorCondition}
    ORDER BY bp.${sortField} ${sortDir}, bp.id ${sortDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.period_code}_${last.id}`;
  }

  return { periods: rows.map(mapPeriod), nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, year, month, period_code, start_date, end_date, status, created_at, updated_at
     FROM billing_periods WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapPeriod(result.rows[0]);
};

const findByYearMonth = async (year, month) => {
  const result = await query(
    `SELECT id FROM billing_periods WHERE year = $1 AND month = $2 LIMIT 1`,
    [year, month]
  );

  return result.rows[0] || null;
};

const findByPeriodCode = async (periodCode) => {
  const result = await query(
    `SELECT id FROM billing_periods WHERE period_code = $1 LIMIT 1`,
    [periodCode]
  );

  return result.rows[0] || null;
};

const create = async (fields) => {
  const { id, year, month, periodCode, startDate, endDate, status } = fields;

  const result = await query(
    `INSERT INTO billing_periods (id, year, month, period_code, start_date, end_date, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
     RETURNING id, year, month, period_code, start_date, end_date, status, created_at, updated_at`,
    [id, year, month, periodCode, startDate, endDate, status]
  );

  return mapPeriod(result.rows[0]);
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let p = 1;

  const fieldMap = { startDate: 'start_date', endDate: 'end_date', status: 'status' };

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
    `UPDATE billing_periods SET ${setClauses.join(', ')} WHERE id = $${p}
     RETURNING id, year, month, period_code, start_date, end_date, status, created_at, updated_at`,
    params
  );

  return mapPeriod(result.rows[0]);
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

module.exports = { findAll, findById, findByYearMonth, findByPeriodCode, create, update, createAuditLog };
