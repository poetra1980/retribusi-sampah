const { query } = require('../config/database');

const getOverview = async ({ billingPeriodId, regionId }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (billingPeriodId) { conditions.push(`b.billing_period_id = $${p}`); params.push(billingPeriodId); p++; }
  if (regionId) { conditions.push(`b.region_id = $${p}`); params.push(regionId); p++; }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE b.status IN ('unpaid', 'partial', 'paid')) AS total_bills,
       COALESCE(SUM(b.amount) FILTER (WHERE b.status IN ('unpaid', 'partial', 'paid')), 0) AS total_bill_amount,
       COALESCE(SUM(b.paid_amount), 0) AS total_paid_amount,
       COALESCE(SUM(b.outstanding_amount), 0) AS total_outstanding_amount,
       COUNT(*) FILTER (WHERE b.status = 'paid') AS paid_bill_count,
       COUNT(*) FILTER (WHERE b.status = 'unpaid') AS unpaid_bill_count,
       COUNT(*) FILTER (WHERE b.status = 'partial') AS partial_bill_count
     FROM bills b
     ${whereClause}`,
    params
  );

  const row = result.rows[0];
  const totalBillCount = parseInt(row.total_bills, 10);

  return {
    totalBills: totalBillCount,
    totalBillAmount: row.total_bill_amount,
    totalPaidAmount: row.total_paid_amount,
    totalOutstandingAmount: row.total_outstanding_amount,
    paidBillCount: parseInt(row.paid_bill_count, 10),
    unpaidBillCount: parseInt(row.unpaid_bill_count, 10),
    partialBillCount: parseInt(row.partial_bill_count, 10),
    collectionRate: totalBillCount > 0
      ? parseFloat((parseFloat(row.paid_bill_count) / totalBillCount).toFixed(4))
      : 0
  };
};

const getDailyPayments = async ({ dateFrom, dateTo, regionId, officerId, paymentMethodId }) => {
  const conditions = ['p.status = $1', 'p.payment_at >= $2::timestamptz', 'p.payment_at <= $3::timestamptz'];
  const params = ['valid', dateFrom, dateTo];
  let p = 4;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }
  if (paymentMethodId) { conditions.push(`p.payment_method_id = $${p}`); params.push(paymentMethodId); p++; }

  const result = await query(
    `SELECT
       p.payment_at::date AS payment_date,
       COUNT(*) AS transaction_count,
       COALESCE(SUM(p.amount), 0) AS total_amount
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY p.payment_at::date
     ORDER BY p.payment_at::date DESC`,
    params
  );

  return result.rows.map((row) => ({
    paymentDate: row.payment_date,
    transactionCount: parseInt(row.transaction_count, 10),
    totalAmount: row.total_amount
  }));
};

const getLatestPayments = async ({ regionId, officerId, limit }) => {
  const conditions = ['p.status = $1'];
  const params = ['valid'];
  let p = 2;

  if (regionId) { conditions.push(`c.region_id = $${p}`); params.push(regionId); p++; }
  if (officerId) { conditions.push(`p.officer_id = $${p}`); params.push(officerId); p++; }

  const result = await query(
    `SELECT p.id, p.payment_number, p.amount, p.payment_at,
            c.full_name AS customer_name, c.customer_number,
            pm.name AS payment_method_name,
            off.full_name AS officer_name
     FROM payments p
     INNER JOIN customers c ON c.id = p.customer_id
     INNER JOIN payment_methods pm ON pm.id = p.payment_method_id
     LEFT JOIN officers off ON off.id = p.officer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.payment_at DESC, p.created_at DESC
     LIMIT $${p}`,
    [...params, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    paymentNumber: row.payment_number,
    amount: row.amount,
    paymentAt: row.payment_at,
    customerName: row.customer_name,
    customerNumber: row.customer_number,
    paymentMethodName: row.payment_method_name,
    officerName: row.officer_name
  }));
};

const getRegionSummaries = async ({ billingPeriodId, parentRegionId }) => {
  const conditions = [];
  const params = [];
  let p = 1;

  if (billingPeriodId) { conditions.push(`b.billing_period_id = $${p}`); params.push(billingPeriodId); p++; }

  let parentCondition = '';
  if (parentRegionId) {
    parentCondition = `AND r.parent_id = $${p}`;
    params.push(parentRegionId);
    p++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT
       r.id AS region_id, r.name AS region_name, r.code AS region_code, r.level AS region_level,
       COUNT(b.id) AS total_bills,
       COALESCE(SUM(b.amount), 0) AS total_bill_amount,
       COALESCE(SUM(b.paid_amount), 0) AS total_paid_amount,
       COALESCE(SUM(b.outstanding_amount), 0) AS total_outstanding_amount,
       COUNT(*) FILTER (WHERE b.status = 'paid') AS paid_bill_count,
       COUNT(*) FILTER (WHERE b.status = 'unpaid') AS unpaid_bill_count
     FROM regions r
     INNER JOIN customers c ON c.region_id = r.id AND c.deleted_at IS NULL
     INNER JOIN bills b ON b.customer_id = c.id
     ${whereClause} ${parentCondition}
     GROUP BY r.id, r.name, r.code, r.level
     ORDER BY r.code ASC`,
    params
  );

  return result.rows.map((row) => {
    const totalBills = parseInt(row.total_bills, 10);
    return {
      regionId: row.region_id,
      regionName: row.region_name,
      regionCode: row.region_code,
      regionLevel: row.region_level,
      totalBills,
      totalBillAmount: row.total_bill_amount,
      totalPaidAmount: row.total_paid_amount,
      totalOutstandingAmount: row.total_outstanding_amount,
      paidBillCount: parseInt(row.paid_bill_count, 10),
      unpaidBillCount: parseInt(row.unpaid_bill_count, 10),
      collectionRate: totalBills > 0
        ? parseFloat((parseFloat(row.paid_bill_count) / totalBills).toFixed(4))
        : 0
    };
  });
};

const getOfficerPerformance = async ({ dateFrom, dateTo, regionId, limit, cursor }) => {
  const conditions = ['p.status = $1', 'p.payment_at >= $2::timestamptz', 'p.payment_at <= $3::timestamptz'];
  const params = ['valid', dateFrom, dateTo];
  let p = 4;

  if (regionId) { conditions.push(`off.region_id = $${p}`); params.push(regionId); p++; }

  let cursorCondition = '';
  if (cursor) {
    const [cursorVal, cursorId] = cursor.split('_');
    if (cursorVal && cursorId) {
      cursorCondition = `AND (total_amount, off.id) < ($${p}::numeric, $${p + 1}::uuid)`;
      params.push(cursorVal, cursorId);
      p += 2;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT off.id AS officer_id, off.full_name AS officer_name, off.officer_number,
           r.name AS region_name,
           COUNT(p.id) AS transaction_count,
           COALESCE(SUM(p.amount), 0) AS total_amount
    FROM officers off
    INNER JOIN payments p ON p.officer_id = off.id
    INNER JOIN regions r ON r.id = off.region_id
    ${whereClause} ${cursorCondition}
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

  return {
    officers: rows.map((row) => ({
      officerId: row.officer_id,
      officerName: row.officer_name,
      officerNumber: row.officer_number,
      regionName: row.region_name,
      transactionCount: parseInt(row.transaction_count, 10),
      totalAmount: row.total_amount
    })),
    nextCursor
  };
};

module.exports = { getOverview, getDailyPayments, getLatestPayments, getRegionSummaries, getOfficerPerformance };
