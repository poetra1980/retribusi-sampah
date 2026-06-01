const repo = require('../repositories/paymentRepository');
const AppError = require('../utils/AppError');

const getRequestContext = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
  requestId: req.headers['x-request-id'] || null
});

const getPrimaryRole = (roles) => (roles && roles.length > 0 ? roles[0] : null);

const list = async (query, currentUser, userRoles) => {
  const effectiveQuery = { ...query };

  if (userRoles && userRoles.includes('petugas') && !userRoles.includes('admin')) {
    const officer = await repo.findOfficerByUserId(currentUser.id);
    if (officer) effectiveQuery.officerId = officer.id;
  }

  const { payments, nextCursor } = await repo.findAll(effectiveQuery);

  return { data: payments, pagination: { limit: query.limit, nextCursor, prevCursor: null } };
};

const create = async (body, currentUser, context) => {
  const idempotencyKey = context.idempotencyKey || null;

  if (idempotencyKey) {
    const existing = await repo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      const payment = await repo.findById(existing.id);
      return payment;
    }
  }

  const { customerId, officerId, paymentMethodId, externalReferenceNumber, amount, paymentAt, latitude, longitude, notes, allocations } = body;

  const customer = await repo.findCustomerById(customerId);
  if (!customer) throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

  const method = await repo.findPaymentMethodById(paymentMethodId);
  if (!method) throw new AppError('Payment method not found', 404, 'PAYMENT_METHOD_NOT_FOUND');
  if (method.status !== 'active') throw new AppError('Payment method is not active', 422, 'PAYMENT_METHOD_INACTIVE');

  const effectiveOfficerId = officerId || (context.userRoles.includes('petugas')
    ? (await repo.findOfficerByUserId(currentUser.id))?.id || null
    : null);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  if (Math.abs(totalAllocated - amount) > 0.01) {
    throw new AppError('Total allocation must equal payment amount', 422, 'ALLOCATION_MISMATCH');
  }

  for (const alloc of allocations) {
    const bill = await repo.findBillById(alloc.billId);
    if (!bill) throw new AppError(`Bill ${alloc.billId} not found`, 404, 'BILL_NOT_FOUND');
    if (bill.customer_id !== customerId) throw new AppError(`Bill ${alloc.billId} does not belong to this customer`, 422, 'BILL_CUSTOMER_MISMATCH');
    if (bill.status === 'cancelled') throw new AppError(`Bill ${alloc.billId} is cancelled`, 422, 'BILL_CANCELLED');
    if (bill.status === 'paid') throw new AppError(`Bill ${alloc.billId} is already paid`, 422, 'BILL_ALREADY_PAID');

    const outstanding = parseFloat(bill.outstanding_amount);
    if (alloc.allocatedAmount > outstanding) {
      throw new AppError(`Allocation ${alloc.allocatedAmount} exceeds outstanding ${outstanding} for bill ${alloc.billId}`, 422, 'ALLOCATION_EXCEEDS_OUTSTANDING');
    }
  }

  const result = await repo.createPaymentTransaction({
    customerId,
    officerId: effectiveOfficerId,
    recordedBy: currentUser.id,
    paymentMethodId,
    externalReferenceNumber,
    amount,
    paymentAt,
    latitude,
    longitude,
    notes,
    idempotencyKey,
    customerNumber: customer.customer_number
  }, allocations);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'payment.create', entityTable: 'payments', entityId: result.paymentId,
    newValues: { customerId, amount, paymentMethodId, billCount: allocations.length },
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  const payment = await repo.findById(result.paymentId);

  return payment;
};

const getById = async (id, currentUser, userRoles) => {
  const payment = await repo.findById(id);
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, payment.customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  if (userRoles && userRoles.includes('petugas') && !userRoles.includes('admin')) {
    const officer = await repo.findOfficerByUserId(currentUser.id);
    if (payment.recordedBy !== currentUser.id && (!officer || payment.officerId !== officer.id)) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }
  }

  return payment;
};

const voidPayment = async (id, body, currentUser, context) => {
  const payment = await repo.findById(id);
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  if (payment.status !== 'valid') throw new AppError('Only valid payments can be voided', 422, 'PAYMENT_NOT_VALID');

  const { reason } = body;

  await repo.voidPaymentTransaction(id, currentUser.id, reason);

  await repo.createAuditLog({
    actorUserId: currentUser.id, actorRoleCode: getPrimaryRole(context.userRoles || []),
    action: 'payment.void', entityTable: 'payments', entityId: id,
    oldValues: { status: payment.status, amount: payment.amount },
    newValues: { status: 'voided' }, reason,
    ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: context.requestId
  });

  return repo.findById(id);
};

const getReceipt = async (id, currentUser, userRoles) => {
  const payment = await repo.findById(id);
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, payment.customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  const receipt = await repo.findReceiptByPaymentId(id);
  if (!receipt) throw new AppError('Receipt not found', 404, 'RECEIPT_NOT_FOUND');

  return receipt;
};

const getAllocations = async (id, currentUser, userRoles) => {
  const payment = await repo.findById(id);
  if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

  if (userRoles && userRoles.includes('warga')) {
    const linked = await repo.findCustomerByUserId(currentUser.id, payment.customerId);
    if (!linked) throw new AppError('Access denied', 403, 'ACCESS_DENIED');
  }

  return repo.findAllocationsByPaymentId(id);
};

module.exports = {
  getRequestContext, list, create, getById, voidPayment, getReceipt, getAllocations
};
