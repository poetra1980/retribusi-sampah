const regionService = require('../../../src/services/regionService');
const AppError = require('../../../src/utils/AppError');

jest.mock('../../../src/repositories/regionRepository');

const regionRepository = require('../../../src/repositories/regionRepository');

describe('regionService', () => {
  const mockContext = { ipAddress: '127.0.0.1', userAgent: 'test', requestId: 'req-1', userRoles: ['admin'] };
  const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };
  const mockRegion = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    parentId: null,
    code: 'KEC-01',
    name: 'Kecamatan 1',
    level: 'kecamatan',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('returns paginated regions', async () => {
      regionRepository.findAll.mockResolvedValue({ regions: [mockRegion], nextCursor: null });

      const result = await regionService.list({ limit: 10 }, mockUser, mockContext);

      expect(result.data).toEqual([mockRegion]);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.nextCursor).toBeNull();
    });
  });

  describe('getTree', () => {
    it('builds region tree', async () => {
      const childRegion = { ...mockRegion, id: 'child-id', parentId: mockRegion.id, level: 'kelurahan', code: 'KEL-01' };
      regionRepository.findTree.mockResolvedValue([mockRegion, childRegion]);

      const result = await regionService.getTree({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('KEC-01');
      expect(result.data[0].children).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates a region successfully', async () => {
      regionRepository.findByCode.mockResolvedValue(null);
      regionRepository.create.mockResolvedValue(mockRegion);
      regionRepository.createAuditLog.mockResolvedValue();

      const result = await regionService.create(
        { code: 'KEC-01', name: 'Kecamatan 1', level: 'kecamatan', status: 'active' },
        mockUser,
        mockContext
      );

      expect(result).toEqual(mockRegion);
      expect(regionRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'region.create' })
      );
    });

    it('throws on duplicate code', async () => {
      regionRepository.findByCode.mockResolvedValue({ id: 'existing' });

      await expect(
        regionService.create({ code: 'KEC-01', name: 'Kecamatan 1', level: 'kecamatan' }, mockUser, mockContext)
      ).rejects.toThrow(AppError);
    });

    it('throws if parent not found', async () => {
      regionRepository.findByCode.mockResolvedValue(null);
      regionRepository.findById.mockResolvedValue(null);

      await expect(
        regionService.create(
          { code: 'KEL-01', name: 'Kelurahan 1', level: 'kelurahan', parentId: 'nonexistent' },
          mockUser,
          mockContext
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('getById', () => {
    it('returns region if found', async () => {
      regionRepository.findById.mockResolvedValue(mockRegion);

      const result = await regionService.getById(mockRegion.id);

      expect(result).toEqual(mockRegion);
    });

    it('throws if not found', async () => {
      regionRepository.findById.mockResolvedValue(null);

      await expect(regionService.getById('nonexistent')).rejects.toThrow(AppError);
    });
  });

  describe('update', () => {
    it('updates region fields', async () => {
      regionRepository.findById.mockResolvedValue(mockRegion);
      regionRepository.findByCode.mockResolvedValue(null);
      regionRepository.update.mockResolvedValue({ ...mockRegion, name: 'Updated Name' });
      regionRepository.createAuditLog.mockResolvedValue();

      const result = await regionService.update(
        mockRegion.id,
        { name: 'Updated Name' },
        mockUser,
        mockContext
      );

      expect(result.name).toBe('Updated Name');
    });

    it('throws self-parent error', async () => {
      regionRepository.findById.mockResolvedValue(mockRegion);

      await expect(
        regionService.update(mockRegion.id, { parentId: mockRegion.id }, mockUser, mockContext)
      ).rejects.toThrow('cannot be its own parent');
    });
  });

  describe('deactivate', () => {
    it('deactivates region', async () => {
      regionRepository.findById.mockResolvedValue(mockRegion);
      regionRepository.hasActiveCustomers.mockResolvedValue(false);
      regionRepository.hasActiveOfficers.mockResolvedValue(false);
      regionRepository.hasActiveChildren.mockResolvedValue(false);
      regionRepository.deactivate.mockResolvedValue({ ...mockRegion, status: 'inactive' });
      regionRepository.createAuditLog.mockResolvedValue();

      const result = await regionService.deactivate(
        mockRegion.id,
        { reason: 'No longer needed' },
        mockUser,
        mockContext
      );

      expect(result.status).toBe('inactive');
    });

    it('blocks deactivation with active customers', async () => {
      regionRepository.findById.mockResolvedValue(mockRegion);
      regionRepository.hasActiveCustomers.mockResolvedValue(true);

      await expect(
        regionService.deactivate(mockRegion.id, { reason: 'test' }, mockUser, mockContext)
      ).rejects.toThrow(/active customers/i);
    });
  });
});
