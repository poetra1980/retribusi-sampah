const request = require('supertest');
const app = require('../../src/app');
const { cleanupTestData, seedTestData, loginAsAdmin, closePool } = require('./helpers');

describe('Customers API Integration', () => {
  let token;
  let regionId;
  let categoryId;

  beforeAll(async () => {
    await cleanupTestData();
    const seedData = await seedTestData();
    token = await loginAsAdmin(request(app));
    regionId = seedData.regionId;
    categoryId = seedData.categoryId;
  });

  afterAll(async () => {
    await cleanupTestData();
    await closePool();
  });

  describe('POST /api/v1/customers', () => {
    it('creates a customer', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerNumber: 'TST-001',
          fullName: 'Test Customer',
          nik: '1234567890123456',
          regionId,
          categoryId,
          startDate: '2024-01-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.customerNumber).toBe('TST-001');
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects duplicate customer number', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerNumber: 'TST-001',
          fullName: 'Duplicate',
          regionId,
          categoryId,
          startDate: '2024-01-01'
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/customers', () => {
    it('returns paginated customers list', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('returns customer by id', async () => {
      const listRes = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`);

      const customerId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(customerId);
    });
  });

  describe('PATCH /api/v1/customers/:id', () => {
    it('updates a customer', async () => {
      const listRes = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`);

      const customerId = listRes.body.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/customers/${customerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Updated Customer Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Updated Customer Name');
    });
  });

  describe('GET /api/v1/customers/:id/addresses', () => {
    it('returns customer addresses', async () => {
      const listRes = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`);

      const customerId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/customers/${customerId}/addresses`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
