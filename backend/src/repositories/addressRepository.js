const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapAddress = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    customerId: row.customer_id,
    regionId: row.region_id,
    addressLine: row.address_line,
    rt: row.rt,
    rw: row.rw,
    tpsCode: row.tps_code,
    tpsName: row.tps_name,
    latitude: row.latitude,
    longitude: row.longitude,
    isPrimary: row.is_primary,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findById = async (id) => {
  const result = await query(
    `SELECT id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at
     FROM customer_addresses WHERE id = $1 LIMIT 1`,
    [id]
  );

  return mapAddress(result.rows[0]);
};

const findByCustomerId = async (customerId, status) => {
  const conditions = ['customer_id = $1'];
  const params = [customerId];
  let p = 2;

  if (status) {
    conditions.push(`status = $${p}`);
    params.push(status);
    p++;
  }

  const result = await query(
    `SELECT id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at
     FROM customer_addresses WHERE ${conditions.join(' AND ')} ORDER BY is_primary DESC, created_at ASC`,
    params
  );

  return result.rows.map(mapAddress);
};

const create = async (customerId, fields) => {
  const { regionId, addressLine, rt, rw, tpsCode, tpsName, latitude, longitude, isPrimary, status } = fields;

  if (isPrimary) {
    await query(
      `UPDATE customer_addresses SET is_primary = false WHERE customer_id = $1 AND is_primary = true AND status = 'active'`,
      [customerId]
    );
  }

  const id = randomUUID();
  const result = await query(
    `INSERT INTO customer_addresses (id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
     RETURNING id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at`,
    [id, customerId, regionId, addressLine || null, rt, rw, tpsCode || null, tpsName || null, latitude || null, longitude || null, isPrimary, status]
  );

  return mapAddress(result.rows[0]);
};

const update = async (id, fields) => {
  const fieldMap = {
    regionId: 'region_id', addressLine: 'address_line', rt: 'rt', rw: 'rw',
    tpsCode: 'tps_code', tpsName: 'tps_name', latitude: 'latitude', longitude: 'longitude',
    isPrimary: 'is_primary', status: 'status'
  };

  const { isPrimary, customerId, ...rest } = fields;

  const setClauses = [];
  const params = [];
  let p = 1;

  for (const [key, value] of Object.entries(rest)) {
    const column = fieldMap[key];
    if (column && value !== undefined) {
      setClauses.push(`${column} = $${p}`);
      params.push(value === '' ? null : value);
      p++;
    }
  }

  if (fields.isPrimary !== undefined) {
    setClauses.push(`is_primary = $${p}`);
    params.push(fields.isPrimary);
    p++;
  }

  if (setClauses.length === 0) return null;

  setClauses.push('updated_at = now()');
  params.push(id);

  const result = await query(
    `UPDATE customer_addresses SET ${setClauses.join(', ')} WHERE id = $${p}
     RETURNING id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at`,
    params
  );

  return mapAddress(result.rows[0]);
};

const setPrimary = async (id, customerId) => {
  await query(
    `UPDATE customer_addresses SET is_primary = false WHERE customer_id = $1 AND is_primary = true AND status = 'active'`,
    [customerId]
  );

  const result = await query(
    `UPDATE customer_addresses SET is_primary = true, updated_at = now() WHERE id = $1
     RETURNING id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at`,
    [id]
  );

  return mapAddress(result.rows[0]);
};

const deactivate = async (id) => {
  const result = await query(
    `UPDATE customer_addresses SET status = 'inactive', updated_at = now() WHERE id = $1
     RETURNING id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at`,
    [id]
  );

  return mapAddress(result.rows[0]);
};

const countActiveByCustomerId = async (customerId) => {
  const result = await query(
    `SELECT COUNT(*) AS cnt FROM customer_addresses WHERE customer_id = $1 AND status = 'active' LIMIT 1`,
    [customerId]
  );

  return parseInt(result.rows[0].cnt, 10);
};

const findCustomerById = async (customerId) => {
  const result = await query(
    `SELECT id, customer_number, full_name FROM customers WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [customerId]
  );

  return result.rows[0] || null;
};

const findRegionById = async (id) => {
  const result = await query(`SELECT id, name FROM regions WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
};

const findCustomerByUserId = async (userId, customerId) => {
  const result = await query(
    `SELECT 1 FROM customer_user_accounts WHERE user_id = $1 AND customer_id = $2 LIMIT 1`,
    [userId, customerId]
  );

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
  findById, findByCustomerId, create, update, setPrimary, deactivate,
  countActiveByCustomerId, findCustomerById, findRegionById, findCustomerByUserId,
  createAuditLog
};
