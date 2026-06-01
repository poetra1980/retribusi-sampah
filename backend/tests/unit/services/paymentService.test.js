const paymentService = require('../../../src/services/paymentService');
const AppError = require('../../../src/utils/AppError');

jest.mock('../../../src/repositories/paymentRepository');

const repo = require('../../../src/repositories/paymentRepository');

describe('paymentService', () => {
  const mockContext = {
    ipAddress: '127.0.0.1', userAgent: 'test', requestId: 'req-1',
    userRoles: ['admin']
  };
  const mockUser = { id: 'admin-user-id' };
  const mockPayment = {
    id: 'pay-1', paymentNumber: 'PAY-001-1234567890', customerId: 'cust-1',
    amount: 50000, status: 'valid', paymentAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated payments', async () => {
      repo.findAll.mockResolvedValue({ payments: [mockPayment], nextCursor: null });

      const result = await paymentService.list({ limit: 10 }, mockUser, ['admin']);

      expect(result.data).toEqual([mockPayment]);
      expect(result.pagination.nextCursor).toBeNull();
    });

    it('filters by officer for petugas role', async () => {
      repo.findOfficerByUserId.mockResolvedValue({ id: 'off-1' });
      repo.findAll.mockResolvedValue({ payments: [mockPayment], nextCursor: null });

      const result = await paymentService.list({ limit: 10 }, mockUser, ['petugas']);

      expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({ officerId: 'off-1' }));
      expect(result.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    const validBody = {
      customerId: 'cust-1',
      paymentMethodId: 'pm-1',
      amount: 50000,
      paymentAt: new Date().toISOString(),
      allocations: [{ billId: 'bill-1', allocatedAmount: 50000 }]
    };

    it('creates a payment successfully', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findCustomerById.mockResolvedValue({ id: 'cust-1', customer_number: 'C001' });
      repo.findPaymentMethodById.mockResolvedValue({ id: 'pm-1', status: 'active' });
      repo.findBillById.mockResolvedValue({ id: 'bill-1', customer_id: 'cust-1', status: 'unpaid', outstanding_amount: 50000 });
      repo.createPaymentTransaction.mockResolvedValue({ paymentId: 'pay-1', paymentNumber: 'PAY-001', receiptNumber: 'RCP-001' });
      repo.findById.mockResolvedValue(mockPayment);
      repo.createAuditLog.mockResolvedValue();

      const result = await paymentService.create(validBody, mockUser, mockContext);

      expect(result).toEqual(mockPayment);
      expect(repo.createPaymentTransaction).toHaveBeenCalled();
    });

    it('returns existing payment on duplicate idempotency key', async () => {
      repo.findByIdempotencyKey.mockResolvedValue({ id: 'pay-existing' });
      repo.findById.mockResolvedValue(mockPayment);

      const result = await paymentService.create(
        validBody,
        mockUser,
        { ...mockContext, idempotencyKey: 'dup-key' }
      );

      expect(result).toEqual(mockPayment);
      expect(repo.createPaymentTransaction).not.toHaveBeenCalled();
    });

    it('throws if customer not found', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findCustomerById.mockResolvedValue(null);

      await expect(paymentService.create(validBody, mockUser, mockContext)).rejects.toThrow(AppError);
    });

    it('throws if payment method inactive', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findCustomerById.mockResolvedValue({ id: 'cust-1', customer_number: 'C001' });
      repo.findPaymentMethodById.mockResolvedValue({ id: 'pm-1', status: 'inactive' });

      await expect(paymentService.create(validBody, mockUser, mockContext)).rejects.toThrow(AppError);
    });

    it('throws if allocation does not match amount', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findCustomerById.mockResolvedValue({ id: 'cust-1', customer_number: 'C001' });
      repo.findPaymentMethodById.mockResolvedValue({ id: 'pm-1', status: 'active' });

      await expect(
        paymentService.create(
          { ...validBody, allocations: [{ billId: 'bill-1', allocatedAmount: 30000 }] },
          mockUser,
          mockContext
        )
      ).rejects.toThrow(/allocation/i);
    });

    it('throws if bill is already paid', async () => {
      repo.findByIdempotencyKey.mockResolvedValue(null);
      repo.findCustomerById.mockResolvedValue({ id: 'cust-1', customer_number: 'C001' });
      repo.findPaymentMethodById.mockResolvedValue({ id: 'pm-1', status: 'active' });
      repo.findBillById.mockResolvedValue({ id: 'bill-1', customer_id: 'cust-1', status: 'paid', outstanding_amount: 0 });

      await expect(paymentService.create(validBody, mockUser, mockContext)).rejects.toThrow(/already paid/i);
    });
  });

  describe('getById', () => {
    it('returns payment if found', async () => {
      repo.findById.mockResolvedValue(mockPayment);

      const result = await paymentService.getById('pay-1', mockUser, ['admin']);

      expect(result).toEqual(mockPayment);
    });

    it('throws if not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(paymentService.getById('nonexistent', mockUser, ['admin'])).rejects.toThrow(AppError);
    });

    it('denies access for warga on unrelated payment', async () => {
      repo.findById.mockResolvedValue(mockPayment);
      repo.findCustomerByUserId.mockResolvedValue(null);

      await expect(
        paymentService.getById('pay-1', mockUser, ['warga'])
      ).rejects.toThrow(AppError);
    });
  });

  describe('voidPayment', () => {
    it('voids a valid payment', async () => {
      repo.findById
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce({ ...mockPayment, status: 'voided' });
      repo.voidPaymentTransaction.mockResolvedValue();
      repo.createAuditLog.mockResolvedValue();

      const result = await paymentService.voidPayment('pay-1', { reason: 'Test void' }, mockUser, mockContext);

      expect(result.status).toBe('voided');
      expect(repo.voidPaymentTransaction).toHaveBeenCalled();
    });

    it('throws if payment already voided', async () => {
      repo.findById.mockResolvedValue({ ...mockPayment, status: 'voided' });

      await expect(
        paymentService.voidPayment('pay-1', { reason: 'test' }, mockUser, mockContext)
      ).rejects.toThrow(/cannot be voided|not valid|voided/i);
    });
  });
});
