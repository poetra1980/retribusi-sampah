const { randomUUID } = require('crypto');

const { query, withTransaction } = require('../config/database');

const mapBill = (row) => {
  if (!row) return null;

  return {
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
    generatedBatchId: row.generated_batch_id,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerNumber: row.customer_number,
    periodCode: row.period_code
  };
};

const findAll = async (filters) => {
  const { q, customerId, billingPeriodId, regionId, categoryId, status, dueDateFrom, dueDateTo, limit, cursor, sort } = filters;

  const conditions = [];
  const params = [];
  let p = 1;

  if (q) {
    conditions.push(`(lower(c.full_name) LIKE lower($${p}) OR lower(b.bill_number) LIKE lower($${p}) OR lower(c.customer_number) LIKE lower($${p}))`);
    params.push(`%${q}%`);
    p++;
  }

  if (customerId) { conditions.push(`b.customer_id = $${p}`); params.push(customerId); p++; }
  if (billingPeriodId) { conditions.push(`b.billing_period_id = $${p}`); params.push(billingPeriodId); p++; }
  if (regionId) { conditions.push(`b.region_id = $${p}`); params.push(regionId); p++; }
  if (categoryId) { conditions.push(`b.category_id = $${p}`); params.push(categoryId); p++; }

  if (status) {
    if (Array.isArray(status)) {
      conditions.push(`b.status = ANY($${p}::varchar[])`);
      params.push(status);
    } else {
      conditions.push(`b.status = $${p}`);
      params.push(status);
    }
    p++;
  }

  if (dueDateFrom) { conditions.push(`b.due_date >= $${p}::date`); params.push(dueDateFrom); p++; }
  if (dueDateTo) { conditions.push(`b.due_date <= $${p}::date`); params.push(dueDateTo); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (b.created_at, b.id) ${operator} ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT b.id, b.bill_number, b.customer_id, b.billing_period_id,
           b.tariff_id, b.region_id, b.category_id, b.amount,
           b.paid_amount, b.outstanding_amount, b.status, b.due_date,
           b.generated_batch_id, b.cancelled_at, b.cancelled_by,
           b.cancellation_reason, b.created_at, b.updated_at,
           c.full_name AS customer_name, c.customer_number,
           bp.period_code
    FROM bills b
    INNER JOIN customers c ON c.id = b.customer_id
    INNER JOIN billing_periods bp ON bp.id = b.billing_period_id
    ${whereClause} ${cursorCondition}
    ORDER BY b.created_at ${sortDir}, b.id ${sortDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { bills: rows.map(mapBill), nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT b.id, b.bill_number, b.customer_id, b.billing_period_id,
            b.tariff_id, b.region_id, b.category_id, b.amount,
            b.paid_amount, b.outstanding_amount, b.status, b.due_date,
            b.generated_batch_id, b.cancelled_at, b.cancelled_by,
            b.cancellation_reason, b.created_at, b.updated_at,
            c.full_name AS customer_name, c.customer_number,
            bp.period_code
     FROM bills b
     INNER JOIN customers c ON c.id = b.customer_id
     INNER JOIN billing_periods bp ON bp.id = b.billing_period_id
     WHERE b.id = $1 LIMIT 1`,
    [id]
  );

  return mapBill(result.rows[0]);
};

const findActiveCustomers = async ({ regionId, categoryId, limit, offset }) => {
  const conditions = ['c.status = $1', 'c.deleted_at IS NULL'];
  const params = ['active'];
  let p = 2;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
  if (categoryId) { conditions.push(`c.category_id = $${p}`); params.push(categoryId); p++; }

  const dataQuery = `
    SELECT c.id, c.customer_number, c.full_name, c.region_id, c.category_id
    FROM customers c
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.customer_number ASC
    LIMIT $${p} OFFSET $${p + 1}
  `;
  params.push(limit, offset);

  const result = await query(dataQuery, params);
  return result.rows;
};

const countActiveCustomers = async ({ regionId, categoryId }) => {
  const conditions = ['status = $1', 'deleted_at IS NULL'];
  const params = ['active'];
  let p = 2;

  if (regionId) { conditions.push(`region_id = $${p}`); params.push(regionId); p++; }
  if (categoryId) { conditions.push(`category_id = $${p}`); params.push(categoryId); p++; }

  const result = await query(
    `SELECT COUNT(*) AS cnt FROM customers WHERE ${conditions.join(' AND ')}`,
    params
  );

  return parseInt(result.rows[0].cnt, 10);
};

const findActiveTariff = async (customerId) => {
  const result = await query(
    `SELECT t.id, t.amount
     FROM tariffs t
     INNER JOIN customers c ON c.id = $1
     WHERE t.category_id = c.category_id
       AND (t.region_id IS NULL OR t.region_id = c.region_id)
       AND t.status = 'active'
       AND t.effective_start_date <= now()::date
       AND (t.effective_end_date IS NULL OR t.effective_end_date >= now()::date)
     ORDER BY t.region_id NULLS LAST, t.effective_start_date DESC
     LIMIT 1`,
    [customerId]
  );

  return result.rows[0] || null;
};

const existsBillForPeriod = async (customerId, billingPeriodId) => {
  const result = await query(
    `SELECT id FROM bills WHERE customer_id = $1 AND billing_period_id = $2 LIMIT 1`,
    [customerId, billingPeriodId]
  );

  return result.rows[0] || null;
};

const createBill = async (fields) => {
  const { id, billNumber, customerId, billingPeriodId, tariffId, regionId, categoryId, amount, dueDate, generatedBatchId } = fields;

  const result = await query(
    `INSERT INTO bills (id, bill_number, customer_id, billing_period_id, tariff_id, region_id, category_id, amount, paid_amount, outstanding_amount, status, due_date, generated_batch_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $8, 'unpaid', $9, $10, now(), now())
     RETURNING id, bill_number, customer_id, billing_period_id, tariff_id, region_id, category_id, amount, paid_amount, outstanding_amount, status, due_date, created_at, updated_at`,
    [id, billNumber, customerId, billingPeriodId, tariffId, regionId, categoryId, amount, dueDate, generatedBatchId || null]
  );

  return mapBill(result.rows[0]);
};

const createGenerationBatch = async (fields) => {
  const { id, billingPeriodId, totalCustomers, createdBy } = fields;

  const result = await query(
    `INSERT INTO bill_generation_batches (id, billing_period_id, status, total_customers, processed_customers, generated_bills, failed_count, created_by, created_at)
     VALUES ($1, $2, 'pending', $3, 0, 0, 0, $4, now())
     RETURNING id, billing_period_id, status, total_customers, processed_customers, generated_bills, failed_count, started_at, finished_at, error_message, created_by, created_at`,
    [id, billingPeriodId, totalCustomers, createdBy]
  );

  return result.rows[0];
};

const updateGenerationBatch = async (id, fields) => {
  const setClauses = [];
  const params = [];
  let p = 1;

  if (fields.status !== undefined) { setClauses.push(`status = $${p}`); params.push(fields.status); p++; }
  if (fields.processedCustomers !== undefined) { setClauses.push(`processed_customers = $${p}`); params.push(fields.processedCustomers); p++; }
  if (fields.generatedBills !== undefined) { setClauses.push(`generated_bills = $${p}`); params.push(fields.generatedBills); p++; }
  if (fields.failedCount !== undefined) { setClauses.push(`failed_count = $${p}`); params.push(fields.failedCount); p++; }
  if (fields.startedAt !== undefined) { setClauses.push(`started_at = $${p}`); params.push(fields.startedAt); p++; }
  if (fields.finishedAt !== undefined) { setClauses.push(`finished_at = $${p}`); params.push(fields.finishedAt); p++; }
  if (fields.errorMessage !== undefined) { setClauses.push(`error_message = $${p}`); params.push(fields.errorMessage); p++; }

  if (setClauses.length === 0) return null;

  params.push(id);

  const result = await query(
    `UPDATE bill_generation_batches SET ${setClauses.join(', ')} WHERE id = $${p}
     RETURNING id, billing_period_id, status, total_customers, processed_customers, generated_bills, failed_count, started_at, finished_at, error_message, created_by, created_at`,
    params
  );

  return result.rows[0];
};

const findGenerationBatches = async ({ billingPeriodId, status, limit, cursor }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (billingPeriodId) { conditions.push(`bgb.billing_period_id = $${p}`); params.push(billingPeriodId); p++; }
  if (status) { conditions.push(`bgb.status = $${p}`); params.push(status); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (bgb.created_at, bgb.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT bgb.id, bgb.billing_period_id, bgb.status, bgb.total_customers,
           bgb.processed_customers, bgb.generated_bills, bgb.failed_count,
           bgb.started_at, bgb.finished_at, bgb.error_message,
           bgb.created_by, bgb.created_at
    FROM bill_generation_batches bgb
    ${whereClause} ${cursorCondition}
    ORDER BY bgb.created_at DESC, bgb.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return { batches: rows, nextCursor };
};

const findGenerationBatchById = async (id) => {
  const result = await query(
    `SELECT id, billing_period_id, status, total_customers, processed_customers, generated_bills, failed_count, started_at, finished_at, error_message, created_by, created_at
     FROM bill_generation_batches WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

const cancelBill = async (id, cancelledBy, reason) => {
  const result = await query(
    `UPDATE bills SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2, cancellation_reason = $3, updated_at = now()
     WHERE id = $1
     RETURNING id, bill_number, customer_id, billing_period_id, tariff_id, region_id, category_id, amount, paid_amount, outstanding_amount, status, due_date, cancelled_at, cancelled_by, cancellation_reason, created_at, updated_at`,
    [id, cancelledBy, reason]
  );

  return mapBill(result.rows[0]);
};

const findPaymentsByBillId = async (billId, { limit, cursor }) => {
  const params = [billId];
  let p = 2;

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (pa.created_at, pa.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT pa.id, pa.payment_id, pa.bill_id, pa.allocated_amount, pa.created_at,
           p.payment_number, p.amount AS payment_amount, p.payment_at, p.status AS payment_status,
           pm.name AS payment_method_name
    FROM payment_allocations pa
    INNER JOIN payments p ON p.id = pa.payment_id
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    WHERE pa.bill_id = $1 ${cursorCondition}
    ORDER BY pa.created_at DESC, pa.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.created_at.toISOString()}_${last.id}`;
  }

  return {
    allocations: rows.map((row) => ({
      id: row.id,
      paymentId: row.payment_id,
      billId: row.bill_id,
      allocatedAmount: row.allocated_amount,
      createdAt: row.created_at,
      paymentNumber: row.payment_number,
      paymentAmount: row.payment_amount,
      paymentAt: row.payment_at,
      paymentStatus: row.payment_status,
      paymentMethodName: row.payment_method_name
    })),
    nextCursor
  };
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
  findAll, findById, findActiveCustomers, countActiveCustomers,
  findActiveTariff, existsBillForPeriod, createBill,
  createGenerationBatch, updateGenerationBatch,
  findGenerationBatches, findGenerationBatchById,
  cancelBill, findPaymentsByBillId,
  findCustomerByUserId, createAuditLog
};
