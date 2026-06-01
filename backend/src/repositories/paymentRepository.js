const { randomUUID } = require('crypto');

const { query, withTransaction } = require('../config/database');

const mapPayment = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    paymentNumber: row.payment_number,
    customerId: row.customer_id,
    officerId: row.officer_id,
    recordedBy: row.recorded_by,
    paymentMethodId: row.payment_method_id,
    externalReferenceNumber: row.external_reference_number,
    amount: row.amount,
    paymentAt: row.payment_at,
    recordedAt: row.recorded_at,
    latitude: row.latitude,
    longitude: row.longitude,
    notes: row.notes,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    voidReason: row.void_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerNumber: row.customer_number,
    officerName: row.officer_name,
    paymentMethodName: row.payment_method_name,
    recordedByName: row.recorded_by_name
  };
};

const findAll = async (filters) => {
  const { q, customerId, officerId, paymentMethodId, status, dateFrom, dateTo, limit, cursor, sort } = filters;

  const conditions = [];
  const params = [];
  let p = 1;

  if (q) {
    conditions.push(`(lower(c.full_name) LIKE lower($${p}) OR lower(p.payment_number) LIKE lower($${p}) OR lower(c.customer_number) LIKE lower($${p}))`);
    params.push(`%${q}%`);
    p++;
  }

  if (customerId) { conditions.push(`p.customer_id = $${p}`); params.push(customerId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }
  if (paymentMethodId) { conditions.push(`p.payment_method_id = $${p}`); params.push(paymentMethodId); p++; }
  if (status) { conditions.push(`p.status = $${p}`); params.push(status); p++; }
  if (dateFrom) { conditions.push(`p.payment_at >= $${p}::timestamptz`); params.push(dateFrom); p++; }
  if (dateTo) { conditions.push(`p.payment_at <= $${p}::timestamptz`); params.push(dateTo); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
      const operator = sortDir === 'ASC' ? '>' : '<';
      cursorCondition = `AND (p.payment_at, p.id) ${operator} ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const sortField = 'payment_at';
  const sortDir = sort && sort.includes(':asc') ? 'ASC' : 'DESC';
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT p.id, p.payment_number, p.customer_id, p.officer_id, p.recorded_by,
           p.payment_method_id, p.external_reference_number, p.amount,
           p.payment_at, p.recorded_at, p.latitude, p.longitude, p.notes, p.status,
           p.idempotency_key, p.voided_at, p.voided_by, p.void_reason,
           p.created_at, p.updated_at,
           c.full_name AS customer_name, c.customer_number,
           off.full_name AS officer_name,
           pm.name AS payment_method_name,
           u.full_name AS recorded_by_name
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    LEFT JOIN officers off ON off.id = p.officer_id
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    INNER JOIN users u ON u.id = p.recorded_by
    ${whereClause} ${cursorCondition}
    ORDER BY p.${sortField} ${sortDir}, p.id ${sortDir}
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.payment_at.toISOString()}_${last.id}`;
  }

  return { payments: rows.map(mapPayment), nextCursor };
};

const findById = async (id) => {
  const result = await query(
    `SELECT p.id, p.payment_number, p.customer_id, p.officer_id, p.recorded_by,
            p.payment_method_id, p.external_reference_number, p.amount,
            p.payment_at, p.recorded_at, p.latitude, p.longitude, p.notes, p.status,
            p.idempotency_key, p.voided_at, p.voided_by, p.void_reason,
            p.created_at, p.updated_at,
            c.full_name AS customer_name, c.customer_number,
            off.full_name AS officer_name,
            pm.name AS payment_method_name,
            u.full_name AS recorded_by_name
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     LEFT JOIN officers off ON off.id = p.officer_id
     INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
     INNER JOIN users u ON u.id = p.recorded_by
     WHERE p.id = $1 LIMIT 1`,
    [id]
  );

  return mapPayment(result.rows[0]);
};

const findByIdempotencyKey = async (key) => {
  const result = await query(
    `SELECT id FROM payments WHERE idempotency_key = $1 LIMIT 1`,
    [key]
  );

  return result.rows[0] || null;
};

const findBillById = async (billId) => {
  const result = await query(
    `SELECT id, customer_id, amount, paid_amount, outstanding_amount, status
     FROM bills WHERE id = $1 LIMIT 1`,
    [billId]
  );

  return result.rows[0] || null;
};

const findPaymentMethodById = async (id) => {
  const result = await query(
    `SELECT id, code, name, requires_reference_number, status FROM payment_methods WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

const findOfficerByUserId = async (userId) => {
  const result = await query(
    `SELECT id, user_id, status FROM officers WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

const createPaymentTransaction = async (paymentData, allocations) => {
  return withTransaction(async (client) => {
    const paymentId = randomUUID();
    const paymentNumber = `PAY-${paymentData.customerNumber}-${Date.now()}`;

    await client.query(
      `INSERT INTO payments (id, payment_number, customer_id, officer_id, recorded_by, payment_method_id, external_reference_number, amount, payment_at, recorded_at, latitude, longitude, notes, status, idempotency_key, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10, $11, $12, 'valid', $13, now(), now())`,
      [paymentId, paymentNumber, paymentData.customerId, paymentData.officerId || null,
       paymentData.recordedBy, paymentData.paymentMethodId, paymentData.externalReferenceNumber || null,
       paymentData.amount, paymentData.paymentAt, paymentData.latitude || null,
       paymentData.longitude || null, paymentData.notes || null, paymentData.idempotencyKey || null]
    );

    for (const alloc of allocations) {
      await client.query(
        `INSERT INTO payment_allocations (id, payment_id, bill_id, allocated_amount, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [randomUUID(), paymentId, alloc.billId, alloc.allocatedAmount]
      );

      const bill = await client.query(
        `SELECT paid_amount, outstanding_amount, amount, status FROM bills WHERE id = $1 FOR UPDATE`,
        [alloc.billId]
      );

      const billRow = bill.rows[0];
      const newPaidAmount = parseFloat(billRow.paid_amount) + alloc.allocatedAmount;
      const newOutstanding = parseFloat(billRow.amount) - newPaidAmount;
      let newStatus = billRow.status;

      if (newOutstanding <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await client.query(
        `UPDATE bills SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = now() WHERE id = $4`,
        [newPaidAmount, Math.max(0, newOutstanding), newStatus, alloc.billId]
      );
    }

    const receiptId = randomUUID();
    const receiptNumber = `RCP-${paymentNumber}`;

    await client.query(
      `INSERT INTO payment_receipts (id, payment_id, receipt_number, issued_at, created_at)
       VALUES ($1, $2, $3, now(), now())`,
      [receiptId, paymentId, receiptNumber]
    );

    return { paymentId, paymentNumber, receiptNumber };
  });
};

const voidPaymentTransaction = async (paymentId, voidedBy, reason) => {
  return withTransaction(async (client) => {
    const payment = await client.query(
      `SELECT id, status FROM payments WHERE id = $1 FOR UPDATE`,
      [paymentId]
    );

    if (!payment.rows[0] || payment.rows[0].status !== 'valid') {
      throw new Error('Payment is not valid or not found');
    }

    const allocations = await client.query(
      `SELECT bill_id, allocated_amount FROM payment_allocations WHERE payment_id = $1`,
      [paymentId]
    );

    for (const alloc of allocations.rows) {
      const bill = await client.query(
        `SELECT paid_amount, outstanding_amount, amount, status FROM bills WHERE id = $1 FOR UPDATE`,
        [alloc.bill_id]
      );

      const billRow = bill.rows[0];
      const newPaidAmount = parseFloat(billRow.paid_amount) - parseFloat(alloc.allocated_amount);
      const newOutstanding = parseFloat(billRow.amount) - newPaidAmount;
      let newStatus = billRow.status;

      if (newPaidAmount <= 0) {
        newStatus = 'unpaid';
      } else if (newPaidAmount < parseFloat(billRow.amount)) {
        newStatus = 'partial';
      } else {
        newStatus = 'paid';
      }

      await client.query(
        `UPDATE bills SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = now() WHERE id = $4`,
        [Math.max(0, newPaidAmount), Math.max(0, newOutstanding), newStatus, alloc.bill_id]
      );
    }

    await client.query(
      `UPDATE payments SET status = 'voided', voided_at = now(), voided_by = $2, void_reason = $3, updated_at = now() WHERE id = $1`,
      [paymentId, voidedBy, reason]
    );
  });
};

const findReceiptByPaymentId = async (paymentId) => {
  const result = await query(
    `SELECT id, payment_id, receipt_number, file_url, issued_at, created_at
     FROM payment_receipts WHERE payment_id = $1 LIMIT 1`,
    [paymentId]
  );

  if (!result.rows[0]) return null;

  return {
    id: result.rows[0].id,
    paymentId: result.rows[0].payment_id,
    receiptNumber: result.rows[0].receipt_number,
    fileUrl: result.rows[0].file_url,
    issuedAt: result.rows[0].issued_at,
    createdAt: result.rows[0].created_at
  };
};

const findAllocationsByPaymentId = async (paymentId) => {
  const result = await query(
    `SELECT pa.id, pa.payment_id, pa.bill_id, pa.allocated_amount, pa.created_at,
            b.bill_number, b.amount AS bill_amount, b.status AS bill_status
     FROM payment_allocations pa
     INNER JOIN bills b ON b.id = pa.bill_id
     WHERE pa.payment_id = $1
     ORDER BY pa.created_at ASC`,
    [paymentId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    billId: row.bill_id,
    allocatedAmount: row.allocated_amount,
    createdAt: row.created_at,
    billNumber: row.bill_number,
    billAmount: row.bill_amount,
    billStatus: row.bill_status
  }));
};

const findCustomerById = async (customerId) => {
  const result = await query(
    `SELECT id, customer_number, full_name FROM customers WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [customerId]
  );

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
  findAll, findById, findByIdempotencyKey,
  findBillById, findPaymentMethodById, findOfficerByUserId,
  createPaymentTransaction, voidPaymentTransaction,
  findReceiptByPaymentId, findAllocationsByPaymentId,
  findCustomerById, findCustomerByUserId,
  createAuditLog
};
