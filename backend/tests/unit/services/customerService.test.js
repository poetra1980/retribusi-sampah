const customerService = require('../../../src/services/customerService');
const AppError = require('../../../src/utils/AppError');

jest.mock('../../../src/repositories/customerRepository');

const customerRepository = require('../../../src/repositories/customerRepository');

describe('customerService', () => {
  const mockContext = {
    ipAddress: '127.0.0.1', userAgent: 'test', requestId: 'req-1',
    userRoles: ['admin']
  };
  const mockUser = { id: 'admin-user-id' };
  const mockCustomer = {
    id: 'cust-1', customerNumber: 'C001', fullName: 'John Doe',
    nik: '1234567890123456', regionId: 'reg-1', categoryId: 'cat-1',
    status: 'active', startDate: '2024-01-01',
    regionName: 'Kecamatan 1', categoryName: 'Rumah Tangga'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated customers', async () => {
      customerRepository.findAll.mockResolvedValue({ customers: [mockCustomer], nextCursor: null });

      const result = await customerService.list({ limit: 10 }, mockUser, ['admin']);

      expect(result.data).toEqual([mockCustomer]);
    });

    it('filters by officer region for petugas', async () => {
      customerRepository.findAll.mockResolvedValue({ customers: [mockCustomer], nextCursor: null });
      customerRepository.findUserById.mockResolvedValue({ id: 'user-1' });
      customerRepository.findUserRoleCodes.mockResolvedValue(['petugas']);

      jest.spyOn(customerService, 'getRequestContext').mockReturnValue(mockContext);

      const result = await customerService.list({ limit: 10 }, { id: 'user-1' }, ['petugas']);

      expect(result.data).toBeDefined();
    });
  });

  describe('create', () => {
    const validBody = {
      customerNumber: 'C001', fullName: 'John Doe', nik: '1234567890123456',
      regionId: 'reg-1', categoryId: 'cat-1', startDate: '2024-01-01'
    };

    it('creates a customer successfully', async () => {
      customerRepository.findByCustomerNumber.mockResolvedValue(null);
      customerRepository.findRegionById.mockResolvedValue({ id: 'reg-1', name: 'Kecamatan 1', status: 'active' });
      customerRepository.findCategoryById.mockResolvedValue({ id: 'cat-1', name: 'Rumah Tangga' });
      customerRepository.create.mockResolvedValue(mockCustomer);
      customerRepository.createAuditLog.mockResolvedValue();

      const result = await customerService.create(validBody, mockUser, mockContext);

      expect(result).toEqual(mockCustomer);
    });

    it('throws on duplicate customer number', async () => {
      customerRepository.findByCustomerNumber.mockResolvedValue({ id: 'existing' });

      await expect(customerService.create(validBody, mockUser, mockContext)).rejects.toThrow(AppError);
    });

    it('throws if region not found', async () => {
      customerRepository.findByCustomerNumber.mockResolvedValue(null);
      customerRepository.findRegionById.mockResolvedValue(null);

      await expect(customerService.create(validBody, mockUser, mockContext)).rejects.toThrow(/Region not found/i);
    });
  });

  describe('getById', () => {
    it('returns customer if found', async () => {
      customerRepository.findById.mockResolvedValue(mockCustomer);
      customerRepository.findAddressesByCustomerId.mockResolvedValue([]);
      customerRepository.findUserAccountsByCustomerId.mockResolvedValue([]);

      const result = await customerService.getById('cust-1', mockUser, ['admin']);

      expect(result).toBeDefined();
      expect(result.addresses).toEqual([]);
    });

    it('throws if not found', async () => {
      customerRepository.findById.mockResolvedValue(null);

      await expect(customerService.getById('nonexistent', mockUser, ['admin'])).rejects.toThrow(AppError);
    });
  });

  describe('update', () => {
    it('updates customer fields', async () => {
      customerRepository.findById.mockResolvedValue(mockCustomer);
      customerRepository.findByCustomerNumber.mockResolvedValue(null);
      customerRepository.update.mockResolvedValue({ ...mockCustomer, fullName: 'Updated Name' });
      customerRepository.createAuditLog.mockResolvedValue();

      const result = await customerService.update(
        'cust-1', { fullName: 'Updated Name' }, mockUser, mockContext
      );

      expect(result.fullName).toBe('Updated Name');
    });

    it('throws if not found', async () => {
      customerRepository.findById.mockResolvedValue(null);

      await expect(
        customerService.update('nonexistent', { fullName: 'Test' }, mockUser, mockContext)
      ).rejects.toThrow(AppError);
    });
  });

  describe('deactivate', () => {
    it('deactivates a customer', async () => {
      customerRepository.findById.mockResolvedValue(mockCustomer);
      customerRepository.softDelete.mockResolvedValue({ ...mockCustomer, status: 'inactive' });
      customerRepository.createAuditLog.mockResolvedValue();

      const result = await customerService.deactivate('cust-1', { endDate: '2024-12-31' }, mockUser, mockContext);

      expect(result.status).toBe('inactive');
    });
  });

  describe('getBills', () => {
    it('returns customer bills', async () => {
      customerRepository.findById.mockResolvedValue(mockCustomer);
      customerRepository.findBillsByCustomerId.mockResolvedValue({ bills: [], nextCursor: null });

      const result = await customerService.getBills('cust-1', { limit: 10 });

      expect(result.data).toEqual([]);
    });
  });
});
