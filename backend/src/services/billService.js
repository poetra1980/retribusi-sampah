const { randomUUID } = require('crypto');

const repo = require('../repositories/billRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const BATCH_SIZE = 500;

const list = async (query, currentUser, userRoles) => {
  const { bills, nextCursor } = await repo.findAll(query);

  return { data: bills, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const generate = async (body, currentUser, context) => {
  const { billingPeriodId, regionId, categoryId, dueDate } = body;

  const totalCustomers = await repo.countActiveCustomers({ regionId, categoryId });

  if (totalCustomers === 0) {
    throw new AppError('No active customers found for the given filters', 422, 'NO_CUSTOMERS');
  }

  const batchId = randomUUID();
  const batch = await repo.createGenerationBatch({
    id: batchId,
    billingPeriodId,
    totalCustomers,
    createdBy: currentUser.id
  });

  await repo.updateGenerationBatch(batchId, { status: 'processing', startedAt: new Date().toISOString() });

  try {
    let processed = 0;
    let generated = 0;
    let failed = 0;
    let offset = 0;

    while (offset < totalCustomers) {
      const customers = await repo.findActiveCustomers({ regionId, categoryId, limit: BATCH_SIZE, offset });

      for (const customer of customers) {
        try {
          const existing = await repo.existsBillForPeriod(customer.id, billingPeriodId);

          if (existing) {
            failed++;
            processed++;
            continue;
          }

          const tariff = await repo.findActiveTariff(customer.id);

          if (!tariff) {
            failed++;
            processed++;
            continue;
          }

          const billId = randomUUID();
          const billNumber = `BL-${customer.customer_number}-${body.billingPeriodId.slice(0, 8)}`;

          await repo.createBill({
            id: billId,
            billNumber,
            customerId: customer.id,
            billingPeriodId,
            tariffId: tariff.id,
            regionId: customer.region_id,
            categoryId: customer.category_id,
            amount: tariff.amount,
            dueDate,
            generatedBatchId: batchId
          });

          generated++;
        } catch (err) {
          failed++;
        }

        processed++;
      }

      await repo.updateGenerationBatch(batchId, {
        processedCustomers: processed,
        generatedBills: generated,
        failedCount: failed
      });

      offset += BATCH_SIZE;
    }

    const finishedAt = new Date().toISOString();
    await repo.updateGenerationBatch(batchId, {
      status: 'completed',
      processedCustomers: processed,
      generatedBills: generated,
      failedCount: failed,
      finishedAt
    });
  } catch (err) {
    await repo.updateGenerationBatch(batchId, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
      errorMessage: err.message
    });
  }

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'bill.generate', entityTable: 'bills', entityId: null,
    newValues: { billingPeriodId, regionId, categoryId, dueDate, batchId },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  const updatedBatch = await repo.findGenerationBatchById(batchId);

  return updatedBatch;
};

const getById = async (id, currentUser, userRoles) => {
  const bill = await repo.findById(id);
  if (!bill) throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, bill.customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  return bill;
};

const cancel = async (id, body, currentUser, context) => {
  const bill = await repo.findById(id);
  if (!bill) throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');

  if (bill.status === 'paid') throw new AppError('Cannot cancel a paid bill', 422, 'BILL_ALREADY_PAID');
  if (bill.status === 'cancelled') throw new AppError('Bill is already cancelled', 422, 'BILL_ALREADY_CANCELLED');

  const { reason } = body;
  const updated = await repo.cancelBill(id, currentUser.id, reason);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'bill.cancel', entityTable: 'bills', entityId: id,
    oldValues: { status: bill.status, amount: bill.amount },
    newValues: { status: 'cancelled' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return updated;
};

const getPayments = async (id, query, currentUser, userRoles) => {
  const bill = await repo.findById(id);
  if (!bill) throw new AppError('Bill not found', 404, 'BILL_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, bill.customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const { allocations, nextCursor } = await repo.findPaymentsByBillId(id, query);

  return { data: allocations, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const listBatches = async (query) => {
  const { batches, nextCursor } = await repo.findGenerationBatches(query);
  return { data: batches, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const getBatchById = async (id) => {
  const batch = await repo.findGenerationBatchById(id);
  if (!batch) throw new AppError('Generation batch not found', 404, 'BATCH_NOT_FOUND');
  return batch;
};

module.exports = {
  getRequestContext, list, generate, getById, cancel, getPayments,
  listBatches, getBatchById
};
