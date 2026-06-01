const { hashPassword, verifyPassword } = require('../../../src/utils/password');

describe('Password Utils', () => {
  const plainPassword = 'TestPassword123!';

  describe('hashPassword', () => {
    it('hashes a password', async () => {
      const hash = await hashPassword(plainPassword);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(plainPassword);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('produces different hashes for same password', async () => {
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const hash = await hashPassword(plainPassword);
      const result = await verifyPassword(plainPassword, hash);
      expect(result).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const hash = await hashPassword(plainPassword);
      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });
});
