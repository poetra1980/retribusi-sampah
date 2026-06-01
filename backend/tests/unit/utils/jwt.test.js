const jwt = require('jsonwebtoken');
const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../../src/utils/jwt');
const AppError = require('../../../src/utils/AppError');

describe('JWT Utils', () => {
  const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };
  const mockRoles = ['admin'];

  describe('signAccessToken', () => {
    it('signs a valid access token', () => {
      const token = signAccessToken(mockUser, mockRoles);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.type).toBe('access');
      expect(decoded.roles).toEqual(mockRoles);
      expect(decoded.jti).toBeDefined();
    });
  });

  describe('signRefreshToken', () => {
    it('signs a valid refresh token', () => {
      const token = signRefreshToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.decode(token);
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
      expect(decoded.jti).toBeDefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a valid access token', () => {
      const token = signAccessToken(mockUser, mockRoles);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.type).toBe('access');
    });

    it('throws for an invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow(AppError);
      expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid or expired access token');
    });

    it('throws for a refresh token passed as access', () => {
      const refreshToken = signRefreshToken(mockUser);
      expect(() => verifyAccessToken(refreshToken)).toThrow(AppError);
    });

    it('throws for expired token', async () => {
      const token = jwt.sign(
        { sub: mockUser.id, type: 'access', roles: mockRoles },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '0s' }
      );
      await new Promise((r) => setTimeout(r, 100));
      expect(() => verifyAccessToken(token)).toThrow(AppError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies a valid refresh token', () => {
      const token = signRefreshToken(mockUser);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(mockUser.id);
      expect(payload.type).toBe('refresh');
    });

    it('throws for an access token passed as refresh', () => {
      const accessToken = signAccessToken(mockUser, mockRoles);
      expect(() => verifyRefreshToken(accessToken)).toThrow(AppError);
    });
  });
});
