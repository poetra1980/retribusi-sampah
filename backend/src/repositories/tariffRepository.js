const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapTariff = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    categoryId: row.category_id,
    regionId: row.region_id,
    amount: row.amount,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryName: row.category_name,
    regionName: row.region_name
  };
};

const findAll = async (filters) => {
  const { q, categoryId, regionId, status, effectiveDate, limit, cursor, sort } = filters;

  const conditions = [];
  const params = [];
  let p = 1;

  if (q) {
    conditions.push(`(lower(t.name) LIKE lower($${p}) OR lower(t.code) LIKE lower($${p}))`);
    params.push(`%${q}%`);
    p++;
  }

  if (categoryId) {
    conditions.push(`t.category_id = $${p}`);
    params.push(categoryId);
    p++;
  }

  if (regionId) {
    conditions.push(`t.region_id = $${p}`);
    params.push(regionId);
    p++;
  }

  if (status) {
    conditions.push(`t.status = $${p}`);
    params.push(status);
    p++;
  }

  if (effectiveDate) {
    conditions.push(`t.effective_start_date <= $${p}::date AND (t.effective_end_date IS NULL OR t.effective_end_date >= $${p}::date)`);
    params.push(effectiveDate);
    p++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (t.code, t.id) ${operator} ($${p}, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const sortField = sort && sort.startsWith('name') ? 'name' : 'code';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT t.id, t.code, t.name, t.category_id, t.region_id, t.amount,
           t.effective_start_date, t.effective_end_date, t.status,
           t.created_by, t.updated_by, t.created_at, t.updated_at,
           cc.name AS category_name, r.name AS region_name
    FROM tariffs t
    LEFT JOIN customer_categories cc ON cc.id = t.category_id
    LEFT JOIN regions r ON r.id = t.region_id
    ${whereClause} ${cursorCondition}
    ORDER BY t.${sortField} ${sortDir}, t.id ${sortDir}
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

  return { tariffs: rows.map(mapTariff), nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT t.id, t.code, t.name, t.category_id, t.region_id, t.amount,
            t.effective_start_date, t.effective_end_date, t.status,
            t.created_by, t.updated_by, t.created_at, t.updated_at,
            cc.name AS category_name, r.name AS region_name
     FROM tariffs t
     LEFT JOIN customer_categories cc ON cc.id = t.category_id
     LEFT JOIN regions r ON r.id = t.region_id
     WHERE t.id = $1 LIMIT 1`,
    [id]
  );

  return mapTariff(result.rows[0]);
};

const findByCode = async (code, excludeId = null) => {
  const result = await query(
    `SELECT id FROM tariffs WHERE code = $1${excludeId ? ' AND id != $2' : ''} LIMIT 1`,
    excludeId ? [code, excludeId] : [code]
  );

  return result.rows[0] || null;
};

const create = async (fields) => {
  const { id, code, name, categoryId, regionId, amount, effectiveStartDate, effectiveEndDate, status, createdBy } = fields;

  const result = await query(
    `INSERT INTO tariffs (id, code, name, category_id, region_id, amount, effective_start_date, effective_end_date, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
     RETURNING id, code, name, category_id, region_id, amount, effective_start_date, effective_end_date, status, created_by, updated_by, created_at, updated_at`,
    [id, code, name, categoryId, regionId || null, amount, effectiveStartDate, effectiveEndDate || null, status, createdBy]
  );

  return mapTariff(result.rows[0]);
};

const update = async (id, fields) => {
  const fieldMap = {
    name: 'name', categoryId: 'category_id', regionId: 'region_id',
    amount: 'amount', effectiveStartDate: 'effective_start_date',
    effectiveEndDate: 'effective_end_date', status: 'status', updatedBy: 'updated_by'
  };

  const setClauses = [];
  const params = [];
  let p = 1;

  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${p}`);
      params.push(value === '' ? null : value);
      p++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push('updated_at = now()');
  params.push(id);

  const result = await query(
    `UPDATE tariffs SET ${setClauses.join(', ')} WHERE id = $${p}
     RETURNING id, code, name, category_id, region_id, amount, effective_start_date, effective_end_date, status, created_by, updated_by, created_at, updated_at`,
    params
  );

  return mapTariff(result.rows[0]);
};

const deactivate = async (id) => {
  const result = await query(
    `UPDATE tariffs SET status = 'inactive', updated_at = now() WHERE id = $1
     RETURNING id, code, name, category_id, region_id, amount, effective_start_date, effective_end_date, status, created_by, updated_by, created_at, updated_at`,
    [id]
  );

  return mapTariff(result.rows[0]);
};

const createHistory = async ({ tariffId, oldAmount, newAmount, oldEffectiveStartDate, newEffectiveStartDate, reason, changedBy }) => {
  const id = randomUUID();

  await query(
    `INSERT INTO tariff_histories (id, tariff_id, old_amount, new_amount, old_effective_start_date, new_effective_start_date, reason, changed_by, changed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [id, tariffId, oldAmount, newAmount, oldEffectiveStartDate, newEffectiveStartDate, reason, changedBy]
  );
};

const findHistoriesByTariffId = async (tariffId, { limit, cursor }) => {
  const conditions = ['tariff_id = $1'];
  const params = [tariffId];
  let p = 2;

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (changed_at, id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT id, tariff_id, old_amount, new_amount, old_effective_start_date, new_effective_start_date, reason, changed_by, changed_at
    FROM tariff_histories
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY changed_at DESC, id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const histories = rows.map((row) => ({
    id: row.id,
    tariffId: row.tariff_id,
    oldAmount: row.old_amount,
    newAmount: row.new_amount,
    oldEffectiveStartDate: row.old_effective_start_date,
    newEffectiveStartDate: row.new_effective_start_date,
    reason: row.reason,
    changedBy: row.changed_by,
    changedAt: row.changed_at
  }));

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.changedAt.toISOString()}_${last.id}`;
  }

  return { histories, nextCursor };
};

const findCategoryById = async (id) => {
  const result = await query(`SELECT id, name FROM customer_categories WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
};

const findRegionById = async (id) => {
  const result = await query(`SELECT id, name FROM regions WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
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
  createHistory, findHistoriesByTariffId,
  findCategoryById, findRegionById, createAuditLog
};
