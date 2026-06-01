const request = require('supertest');
const app = require('../../src/app');
const { cleanupTestData, closePool } = require('./helpers');

describe('Auth API Integration', () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closePool();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 400 for invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 for wrong credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 200 and tokens for valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.roles).toContain('admin');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns current user profile with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.username).toBe('admin');
      expect(res.body.data.roles).toContain('admin');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 without refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns new access token with valid refresh token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 on successful logout', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginRes.body.data.accessToken;
      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Logout successful');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('changes password successfully', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'admin123',
          newPassword: 'newAdmin456!',
          confirmPassword: 'newAdmin456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Password changed successfully');

      await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'newAdmin456!',
          newPassword: 'admin123',
          confirmPassword: 'admin123'
        });

      expect(res.status).toBe(200);
    });
  });
});
