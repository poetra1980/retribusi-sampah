const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const mapCustomer = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    customerNumber: row.customer_number,
    nik: row.nik,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    regionId: row.region_id,
    categoryId: row.category_id,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

const findAll = async (filters) => {
  const {
    q, customerNumber, nik, regionId, categoryId, status,
    rt, rw, tpsCode, limit, cursor, sort
  } = filters;

  const conditions = ['c.deleted_at IS NULL'];
  const params = [];
  let p = 1;

  if (q) {
    conditions.push(`(lower(c.full_name) LIKE lower($${p}) OR lower(c.customer_number) LIKE lower($${p}) OR lower(c.nik) LIKE lower($${p}) OR lower(c.phone_number) LIKE lower($${p}))`);
    params.push(`%${q}%`);
    p++;
  }

  if (customerNumber) {
    conditions.push(`c.customer_number = $${p}`);
    params.push(customerNumber);
    p++;
  }

  if (nik) {
    conditions.push(`c.nik = $${p}`);
    params.push(nik);
    p++;
  }

  if (regionId) {
    conditions.push(`c.region_id = $${p}`);
    params.push(regionId);
    p++;
  }

  if (categoryId) {
    conditions.push(`c.category_id = $${p}`);
    params.push(categoryId);
    p++;
  }

  if (status) {
    conditions.push(`c.status = $${p}`);
    params.push(status);
    p++;
  }

  if (rt || rw || tpsCode) {
    const addrConds = [];
    if (rt) { addrConds.push(`ca.rt = $${p}`); params.push(rt); p++; }
    if (rw) { addrConds.push(`ca.rw = $${p}`); params.push(rw); p++; }
    if (tpsCode) { addrConds.push(`ca.tps_code = $${p}`); params.push(tpsCode); p++; }
    conditions.push(`EXISTS (SELECT 1 FROM customer_addresses ca WHERE ca.customer_id = c.id AND ca.status = 'active' AND ${addrConds.join(' AND ')})`);
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (c.customer_number, c.id) ${operator} ($${p}, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const sortField = 'customer_number';
  const sortDir = sort && sort.includes(':desc') ? 'DESC' : 'ASC';

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      c.id, c.customer_number, c.nik, c.full_name, c.phone_number,
      c.region_id, c.category_id, c.status, c.start_date, c.end_date,
      c.created_by, c.updated_by, c.created_at, c.updated_at,
      r.name AS region_name, cc.name AS category_name
    FROM customers c
    LEFT JOIN regions r ON r.id = c.region_id
    LEFT JOIN customer_categories cc ON cc.id = c.category_id
    ${whereClause}
    ${cursorCondition}
    ORDER BY c.${sortField} ${sortDir}, c.id ${sortDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const customers = rows.map((row) => ({
    ...mapCustomer(row),
    regionName: row.region_name,
    categoryName: row.category_name
  }));

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.customer_number}_${last.id}`;
  }

  return { customers, nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT
       c.id, c.customer_number, c.nik, c.full_name, c.phone_number,
       c.region_id, c.category_id, c.status, c.start_date, c.end_date,
       c.created_by, c.updated_by, c.created_at, c.updated_at,
       r.name AS region_name, cc.name AS category_name
     FROM customers c
     LEFT JOIN regions r ON r.id = c.region_id
     LEFT JOIN customer_categories cc ON cc.id = c.category_id
     WHERE c.id = $1 AND c.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  const row = result.rows[0];
  if (!row) return null;

  return { ...mapCustomer(row), regionName: row.region_name, categoryName: row.category_name };
};

const findByCustomerNumber = async (customerNumber, excludeId = null) => {
  const result = await query(
    `SELECT id FROM customers WHERE customer_number = $1 AND deleted_at IS NULL${excludeId ? ' AND id != $2' : ''} LIMIT 1`,
    excludeId ? [customerNumber, excludeId] : [customerNumber]
  );

  return result.rows[0] || null;
};

const create = async (fields) => {
  const { id, customerNumber, nik, fullName, phoneNumber, regionId, categoryId, status, startDate, createdBy } = fields;

  const result = await query(
    `INSERT INTO customers (id, customer_number, nik, full_name, phone_number, region_id, category_id, status, start_date, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
     RETURNING
       id, customer_number, nik, full_name, phone_number,
       region_id, category_id, status, start_date, end_date,
       created_by, updated_by, created_at, updated_at`,
    [id, customerNumber, nik || null, fullName, phoneNumber || null, regionId, categoryId, status, startDate, createdBy]
  );

  return mapCustomer(result.rows[0]);
};

const update = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let p = 1;

  const fieldMap = {
    nik: 'nik', fullName: 'full_name', phoneNumber: 'phone_number',
    regionId: 'region_id', categoryId: 'category_id', status: 'status',
    startDate: 'start_date', endDate: 'end_date', updatedBy: 'updated_by'
  };

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
    `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${p} AND deleted_at IS NULL
     RETURNING
       id, customer_number, nik, full_name, phone_number,
       region_id, category_id, status, start_date, end_date,
       created_by, updated_by, created_at, updated_at`,
    params
  );

  return mapCustomer(result.rows[0]);
};

const softDelete = async (id, endDate) => {
  const result = await query(
    `UPDATE customers
     SET status = 'inactive', end_date = COALESCE($2, end_date), deleted_at = now(), updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING
       id, customer_number, nik, full_name, phone_number,
       region_id, category_id, status, start_date, end_date,
       created_by, updated_by, created_at, updated_at`,
    [id, endDate || null]
  );

  return mapCustomer(result.rows[0]);
};

const findAddressesByCustomerId = async (customerId) => {
  const result = await query(
    `SELECT id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at
     FROM customer_addresses WHERE customer_id = $1 ORDER BY is_primary DESC, created_at ASC`,
    [customerId]
  );

  return result.rows.map((row) => ({
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
  }));
};

const createAddress = async (fields) => {
  const { id, customerId, regionId, addressLine, rt, rw, tpsCode, tpsName, latitude, longitude, isPrimary, status } = fields;

  if (isPrimary) {
    await query(
      `UPDATE customer_addresses SET is_primary = false WHERE customer_id = $1 AND is_primary = true`,
      [customerId]
    );
  }

  const result = await query(
    `INSERT INTO customer_addresses (id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
     RETURNING id, customer_id, region_id, address_line, rt, rw, tps_code, tps_name, latitude, longitude, is_primary, status, created_at, updated_at`,
    [id, customerId, regionId, addressLine || null, rt || null, rw || null, tpsCode || null, tpsName || null, latitude || null, longitude || null, isPrimary, status]
  );

  return result.rows[0];
};

const findUserAccountsByCustomerId = async (customerId) => {
  const result = await query(
    `SELECT cua.customer_id, cua.user_id, cua.is_primary, cua.created_at,
            u.username, u.full_name, u.email, u.status AS user_status
     FROM customer_user_accounts cua
     INNER JOIN users u ON u.id = cua.user_id
     WHERE cua.customer_id = $1
     ORDER BY cua.is_primary DESC`,
    [customerId]
  );

  return result.rows.map((row) => ({
    customerId: row.customer_id,
    userId: row.user_id,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    userStatus: row.user_status
  }));
};

const linkUserAccount = async (customerId, userId, isPrimary) => {
  const existing = await query(
    `SELECT 1 FROM customer_user_accounts WHERE customer_id = $1 AND user_id = $2 LIMIT 1`,
    [customerId, userId]
  );

  if (existing.rows[0]) {
    return { alreadyLinked: true };
  }

  await query(
    `INSERT INTO customer_user_accounts (customer_id, user_id, is_primary, created_at) VALUES ($1, $2, $3, now())`,
    [customerId, userId, isPrimary]
  );

  return { alreadyLinked: false };
};

const unlinkUserAccount = async (customerId, userId) => {
  const result = await query(
    `DELETE FROM customer_user_accounts WHERE customer_id = $1 AND user_id = $2`,
    [customerId, userId]
  );

  return result.rowCount > 0;
};

const findBillsByCustomerId = async (customerId, { billingPeriodId, status, limit, cursor }) => {
  const conditions = ['b.customer_id = $1'];
  const params = [customerId];
  let p = 2;

  if (billingPeriodId) {
    conditions.push(`b.billing_period_id = $${p}`);
    params.push(billingPeriodId);
    p++;
  }

  if (status) {
    conditions.push(`b.status = $${p}`);
    params.push(status);
    p++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (b.created_at, b.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT
      b.id, b.bill_number, b.customer_id, b.billing_period_id,
      b.tariff_id, b.region_id, b.category_id, b.amount,
      b.paid_amount, b.outstanding_amount, b.status, b.due_date,
      b.cancelled_at, b.cancelled_by, b.cancellation_reason,
      b.created_at, b.updated_at,
      bp.period_code
    FROM bills b
    INNER JOIN billing_periods bp ON bp.id = b.billing_period_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const bills = rows.map((row) => ({
    id: row.id,
    billNumber: row.bill_number,
    customerId: row.customer_id,
    billingPeriodId: row.billing_period_id,
    tariffId: row.tariff_id,
    regionId: row.region_id,
    categoryId: row.category_id,
    amount: row.amount,
    paidAmount: row.paid_amount,
    outstandingAmount: row.outstanding_amount,
    status: row.status,
    dueDate: row.due_date,
    periodCode: row.period_code,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { bills, nextCursor };
};

const findPaymentsByCustomerId = async (customerId, { dateFrom, dateTo, paymentMethodId, limit, cursor }) => {
  const conditions = ['p.customer_id = $1'];
  const params = [customerId];
  let p = 2;

  if (dateFrom) {
    conditions.push(`p.payment_at >= $${p}`);
    params.push(dateFrom);
    p++;
  }

  if (dateTo) {
    conditions.push(`p.payment_at <= $${p}`);
    params.push(dateTo);
    p++;
  }

  if (paymentMethodId) {
    conditions.push(`p.payment_method_id = $${p}`);
    params.push(paymentMethodId);
    p++;
  }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (p.payment_at, p.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT
      p.id, p.payment_number, p.customer_id, p.officer_id, p.recorded_by,
      p.payment_method_id, p.external_reference_number, p.amount,
      p.payment_at, p.recorded_at, p.latitude, p.longitude, p.notes, p.status,
      p.voided_at, p.voided_by, p.void_reason, p.created_at, p.updated_at,
      pm.name AS payment_method_name
    FROM payments p
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY p.payment_at DESC, p.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  const payments = rows.map((row) => ({
    id: row.id,
    paymentNumber: row.payment_number,
    customerId: row.customer_id,
    officerId: row.officer_id,
    recordedBy: row.recorded_by,
    paymentMethodId: row.payment_method_id,
    paymentMethodName: row.payment_method_name,
    externalReferenceNumber: row.external_reference_number,
    amount: row.amount,
    paymentAt: row.payment_at,
    recordedAt: row.recorded_at,
    latitude: row.latitude,
    longitude: row.longitude,
    notes: row.notes,
    status: row.status,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    voidReason: row.void_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.payment_at.toISOString()}_${last.id}`;
  }

  return { payments, nextCursor };
};

const findRegionById = async (id) => {
  const result = await query(`SELECT id, name FROM regions WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
};

const findCategoryById = async (id) => {
  const result = await query(`SELECT id, name FROM customer_categories WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
};

const findUserById = async (userId) => {
  const result = await query(
    `SELECT id, username, full_name, status FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

const findUserRoleCodes = async (userId) => {
  const result = await query(
    `SELECT r.code FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1 ORDER BY r.code`,
    [userId]
  );
  return result.rows.map((row) => row.code);
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
  findAll, findById, findByCustomerNumber,
  create, update, softDelete,
  findAddressesByCustomerId, createAddress,
  findUserAccountsByCustomerId, linkUserAccount, unlinkUserAccount,
  findBillsByCustomerId, findPaymentsByCustomerId,
  findRegionById, findCategoryById, findUserById, findUserRoleCodes, findCustomerByUserId,
  createAuditLog
};
