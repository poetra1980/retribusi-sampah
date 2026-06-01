const authService = require('../../../src/services/authService');
const AppError = require('../../../src/utils/AppError');
const jwt = require('jsonwebtoken');

jest.mock('../../../src/repositories/authRepository');

const authRepository = require('../../../src/repositories/authRepository');

describe('authService', () => {
  const mockContext = { ipAddress: '127.0.0.1', userAgent: 'test-agent', requestId: 'req-123' };
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'admin',
    email: 'admin@test.com',
    fullName: 'Admin User',
    status: 'active',
    passwordHash: '$2b$04$mockedhash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const hashPassword = require('../../../src/utils/password').hashPassword;
  let mockPasswordHash;

  beforeAll(async () => {
    mockPasswordHash = await hashPassword('admin123');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authRepository.sanitizeUser.mockImplementation((user) => {
      if (!user) return null;
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });
  });

  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      authRepository.findUserByLogin.mockResolvedValue({ ...mockUser, passwordHash: mockPasswordHash });
      authRepository.findRoleCodesByUserId.mockResolvedValue(['admin']);
      authRepository.findOfficerByUserId.mockResolvedValue(null);
      authRepository.findCustomerAccountsByUserId.mockResolvedValue([]);
      authRepository.createAuditLog.mockResolvedValue();
      authRepository.updateLastLoginAt.mockResolvedValue();

      const result = await authService.login({ username: 'admin', password: 'admin123' }, mockContext);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.roles).toEqual(['admin']);
      expect(authRepository.updateLastLoginAt).toHaveBeenCalled();
      expect(authRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' })
      );
    });

    it('throws error for invalid credentials', async () => {
      authRepository.findUserByLogin.mockResolvedValue({ ...mockUser, passwordHash: mockPasswordHash });
      authRepository.createAuditLog.mockResolvedValue();

      await expect(
        authService.login({ username: 'admin', password: 'wrong' }, mockContext)
      ).rejects.toThrow(AppError);

      expect(authRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login_failed' })
      );
    });

    it('throws error for inactive user', async () => {
      authRepository.findUserByLogin.mockResolvedValue({ ...mockUser, status: 'inactive', passwordHash: mockPasswordHash });
      authRepository.createAuditLog.mockResolvedValue();

      await expect(
        authService.login({ username: 'admin', password: 'admin123' }, mockContext)
      ).rejects.toThrow(AppError);
    });

    it('throws error for non-existent user', async () => {
      authRepository.findUserByLogin.mockResolvedValue(null);
      authRepository.createAuditLog.mockResolvedValue();

      await expect(
        authService.login({ username: 'nonexistent', password: 'admin123' }, mockContext)
      ).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    it('refreshes token successfully', async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      authRepository.findRoleCodesByUserId.mockResolvedValue(['admin']);
      authRepository.findOfficerByUserId.mockResolvedValue(null);
      authRepository.findCustomerAccountsByUserId.mockResolvedValue([]);
      authRepository.createAuditLog.mockResolvedValue();

      const refreshToken = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d', jwtid: 'test-jti' }
      );

      const result = await authService.refreshToken({ refreshToken }, mockContext);

      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBeDefined();
    });

    it('throws for invalid refresh token', async () => {
      await expect(
        authService.refreshToken({ refreshToken: 'invalid' }, mockContext)
      ).rejects.toThrow(AppError);
    });

    it('throws for inactive user', async () => {
      authRepository.findUserById.mockResolvedValue({ ...mockUser, status: 'inactive' });

      const refreshToken = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d', jwtid: 'test-jti' }
      );

      await expect(
        authService.refreshToken({ refreshToken }, mockContext)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getCurrentUserProfile', () => {
    it('returns profile for active user', async () => {
      authRepository.findUserById.mockResolvedValue(mockUser);
      authRepository.findRoleCodesByUserId.mockResolvedValue(['admin']);
      authRepository.findOfficerByUserId.mockResolvedValue(null);
      authRepository.findCustomerAccountsByUserId.mockResolvedValue([]);

      const result = await authService.getCurrentUserProfile(mockUser.id);

      expect(result.user).toBeDefined();
      expect(result.roles).toEqual(['admin']);
      expect(result.user.passwordHash).toBeUndefined();
    });

    it('throws for inactive user', async () => {
      authRepository.findUserById.mockResolvedValue({ ...mockUser, status: 'inactive' });

      await expect(
        authService.getCurrentUserProfile(mockUser.id)
      ).rejects.toThrow(AppError);
    });
  });

  describe('changePassword', () => {
    const mockCurrentUser = { id: mockUser.id };

    it('changes password successfully', async () => {
      const currentPassword = 'oldPass123';
      const newPassword = 'newPass456!';

      authRepository.findUserById.mockResolvedValue(mockUser);
      authRepository.findRoleCodesByUserId.mockResolvedValue(['admin']);
      authRepository.createAuditLog.mockResolvedValue();

      const { hashPassword } = require('../../../src/utils/password');
      const oldHash = await hashPassword(currentPassword);
      authRepository.findUserById.mockResolvedValue({ ...mockUser, passwordHash: oldHash });
      authRepository.updatePasswordHash.mockResolvedValue();

      const result = await authService.changePassword(
        { currentPassword, newPassword, confirmPassword: newPassword },
        mockCurrentUser,
        mockContext
      );

      expect(result.message).toBe('Password changed successfully');
      expect(authRepository.updatePasswordHash).toHaveBeenCalled();
    });

    it('throws if current password is wrong', async () => {
      const { hashPassword } = require('../../../src/utils/password');
      const oldHash = await hashPassword('actualPass');
      authRepository.findUserById.mockResolvedValue({ ...mockUser, passwordHash: oldHash });

      await expect(
        authService.changePassword(
          { currentPassword: 'wrongPass', newPassword: 'newPass456!' },
          mockCurrentUser,
          mockContext
        )
      ).rejects.toThrow('Current password is invalid');
    });
  });
});
