const { randomUUID } = require('crypto');

const { query } = require('../config/database');

const getDailyPayments = async ({ date, regionId, officerId, paymentMethodId, limit, cursor }) => {
  const conditions = ['p.status = $1', 'p.payment_at::date = $2::date'];
  const params = ['valid', date];
  let p = 3;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }
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

  const dataQuery = `
    SELECT p.id, p.payment_number, p.amount, p.payment_at, p.recorded_at,
           p.external_reference_number, p.notes,
           c.full_name AS customer_name, c.customer_number,
           off.full_name AS officer_name,
           pm.name AS payment_method_name,
           u.full_name AS recorded_by_name
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    LEFT JOIN officers off ON off.id = p.officer_id
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    INNER JOIN users u ON u.id = p.recorded_by
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY p.payment_at DESC, p.id DESC
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

  return { payments: rows, nextCursor };
};

const getMonthlyPayments = async ({ year, month, regionId, officerId, paymentMethodId, limit, cursor }) => {
  const conditions = ['p.status = $1', 'EXTRACT(YEAR FROM p.payment_at) = $2::int', 'EXTRACT(MONTH FROM p.payment_at) = $3::int'];
  const params = ['valid', year, month];
  let p = 4;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }
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

  const dataQuery = `
    SELECT p.id, p.payment_number, p.amount, p.payment_at, p.recorded_at,
           p.external_reference_number, p.notes,
           c.full_name AS customer_name, c.customer_number,
           off.full_name AS officer_name,
           pm.name AS payment_method_name
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    LEFT JOIN officers off ON off.id = p.officer_id
    INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY p.payment_at DESC, p.id DESC
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

  return { payments: rows, nextCursor };
};

const getYearlyPayments = async ({ year, regionId, paymentMethodId, limit, cursor }) => {
  const conditions = ['p.status = $1', 'EXTRACT(YEAR FROM p.payment_at) = $2::int'];
  const params = ['valid', year];
  let p = 3;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
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

  const dataQuery = `
    SELECT
      to_char(p.payment_at, 'YYYY-MM') AS payment_month,
      COUNT(*) AS transaction_count,
      COALESCE(SUM(p.amount), 0) AS total_amount
    FROM payments p
    INNER JOIN customers c ON c.id = p.customer_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    GROUP BY payment_month
    ORDER BY payment_month DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.payment_month}`;
  }

  return { payments: rows, nextCursor };
};

const getArrears = async ({ billingPeriodId, regionId, categoryId, minOutstandingAmount, limit, cursor }) => {
  const conditions = ['b.billing_period_id = $1', 'b.status IN ($2, $3)'];
  const params = [billingPeriodId, 'unpaid', 'partial'];
  let p = 4;

  if (regionId) { conditions.push(`b.region_id = $${p}`); params.push(regionId); p++; }
  if (categoryId) { conditions.push(`b.category_id = $${p}`); params.push(categoryId); p++; }
  if (minOutstandingAmount > 0) { conditions.push(`b.outstanding_amount >= $${p}`); params.push(minOutstandingAmount); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      cursorCondition = `AND (b.outstanding_amount, b.id) < ($${p}::numeric, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT b.id, b.bill_number, b.amount, b.paid_amount, b.outstanding_amount,
           b.status, b.due_date, b.created_at,
           c.full_name AS customer_name, c.customer_number,
           r.name AS region_name, cc.name AS category_name
    FROM bills b
    INNER JOIN customers c ON c.id = b.customer_id
    INNER JOIN regions r ON r.id = b.region_id
    INNER JOIN customer_categories cc ON cc.id = b.category_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    ORDER BY b.outstanding_amount DESC, b.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.outstanding_amount}_${last.id}`;
  }

  return { arrears: rows, nextCursor };
};

const getCollectionRate = async ({ billingPeriodId, regionId }) => {
  const conditions = ['b.billing_period_id = $1'];
  const params = [billingPeriodId];

  if (regionId) { conditions.push(`b.region_id = $2`); params.push(regionId); }

  const result = await query(
    `SELECT
       COUNT(*) AS total_bills,
       COALESCE(SUM(b.amount), 0) AS total_bill_amount,
       COALESCE(SUM(b.paid_amount), 0) AS total_paid_amount,
       COALESCE(SUM(b.outstanding_amount), 0) AS total_outstanding_amount,
       COUNT(*) FILTER (WHERE b.status = 'paid') AS paid_count,
       COUNT(*) FILTER (WHERE b.status = 'unpaid') AS unpaid_count,
       COUNT(*) FILTER (WHERE b.status = 'partial') AS partial_count
     FROM bills b
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  const row = result.rows[0];
  const totalBills = parseInt(row.total_bills, 10);

  return {
    billingPeriodId,
    regionId: regionId || null,
    totalBills,
    totalBillAmount: row.total_bill_amount,
    totalPaidAmount: row.total_paid_amount,
    totalOutstandingAmount: row.total_outstanding_amount,
    paidCount: parseInt(row.paid_count, 10),
    unpaidCount: parseInt(row.unpaid_count, 10),
    partialCount: parseInt(row.partial_count, 10),
    collectionRate: totalBills > 0
      ? parseFloat((parseFloat(row.paid_count) / totalBills).toFixed(4))
      : 0
  };
};

const getOfficerPerformance = async ({ dateFrom, dateTo, regionId, officerId, limit, cursor }) => {
  const conditions = ['p.status = $1', 'p.payment_at >= $2::timestamptz', 'p.payment_at <= $3::timestamptz'];
  const params = ['valid', dateFrom, dateTo];
  let p = 4;

  if (regionId) { conditions.push(`off.region_id = $${p}`); params.push(regionId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      cursorCondition = `AND (total_amount, off.id) < ($${p}::numeric, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const dataQuery = `
    SELECT off.id AS officer_id, off.full_name AS officer_name, off.officer_number,
           r.name AS region_name,
           COUNT(p.id) AS transaction_count,
           COALESCE(SUM(p.amount), 0) AS total_amount,
           MIN(p.payment_at) AS first_payment,
           MAX(p.payment_at) AS last_payment
    FROM officers off
    INNER JOIN payments p ON p.officer_id = off.id
    INNER JOIN regions r ON r.id = off.region_id
    WHERE ${conditions.join(' AND ')} ${cursorCondition}
    GROUP BY off.id, off.full_name, off.officer_number, r.name
    ORDER BY total_amount DESC, off.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.total_amount}_${last.officer_id}`;
  }

  return { officers: rows, nextCursor };
};

const createExportJob = async ({ id, requestedBy, reportType, parameters }) => {
  await query(
    `INSERT INTO export_jobs (id, requested_by, report_type, parameters, status, requested_at)
     VALUES ($1, $2, $3, $4::jsonb, 'pending', now())`,
    [id, requestedBy, reportType, JSON.stringify(parameters)]
  );

  return { id, status: 'pending' };
};

const findExportJobs = async ({ status, reportType, limit, cursor }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (status) { conditions.push(`ej.status = $${p}`); params.push(status); p++; }
  if (reportType) { conditions.push(`ej.report_type = $${p}`); params.push(reportType); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorDate, cursorId] = cursor.split('_');
    if (cursorDate && cursorId) {
      cursorCondition = `AND (ej.requested_at, ej.id) < ($${p}::timestamptz, $${p + 1}::uuid)`;
      params.push(cursorDate, cursorId);
      p += 2;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT ej.id, ej.requested_by, ej.report_type, ej.parameters,
           ej.status, ej.file_url, ej.row_count, ej.error_message,
           ej.requested_at, ej.started_at, ej.finished_at, ej.expires_at,
           u.full_name AS requested_by_name
    FROM export_jobs ej
    INNER JOIN users u ON u.id = ej.requested_by
    ${whereClause} ${cursorCondition}
    ORDER BY ej.requested_at DESC, ej.id DESC
    LIMIT $${p}
  `;
  params.push(limit + 1);

  const result = await query(dataQuery, params);
  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

  let nextCursor = null;
  if (hasMore && rows.length > 0) {
    const last = rows[rows.length - 1];
    nextCursor = `${last.requested_at.toISOString()}_${last.id}`;
  }

  return { jobs: rows, nextCursor };
};

const findExportJobById = async (id) => {
  const result = await query(
    `SELECT ej.id, ej.requested_by, ej.report_type, ej.parameters,
            ej.status, ej.file_url, ej.row_count, ej.error_message,
            ej.requested_at, ej.started_at, ej.finished_at, ej.expires_at,
            u.full_name AS requested_by_name
     FROM export_jobs ej
     INNER JOIN users u ON u.id = ej.requested_by
     WHERE ej.id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

const updateExportJob = async (id, fields) => {
  const sets = [];
  const params = [];
  let p = 1;

  if (fields.status !== undefined) { sets.push(`status = $${p}`); params.push(fields.status); p++; }
  if (fields.file_url !== undefined) { sets.push(`file_url = $${p}`); params.push(fields.file_url); p++; }
  if (fields.rowCount !== undefined) { sets.push(`row_count = $${p}`); params.push(fields.rowCount); p++; }
  if (fields.errorMessage !== undefined) { sets.push(`error_message = $${p}`); params.push(fields.errorMessage); p++; }
  if (fields.startedAt !== undefined) { sets.push(`started_at = $${p}`); params.push(fields.startedAt); p++; }
  if (fields.finishedAt !== undefined) { sets.push(`finished_at = $${p}`); params.push(fields.finishedAt); p++; }

  if (sets.length === 0) return;
  params.push(id);

  await query(`UPDATE export_jobs SET ${sets.join(', ')} WHERE id = $${p}`, params);
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

module.exports = {
  getDailyPayments, getMonthlyPayments, getYearlyPayments,
  getArrears, getCollectionRate, getOfficerPerformance,
  createExportJob, updateExportJob, findExportJobs, findExportJobById, createAuditLog
};
