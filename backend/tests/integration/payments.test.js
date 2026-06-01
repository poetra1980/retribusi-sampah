const request = require('supertest');
const app = require('../../src/app');
const { cleanupTestData, seedTestData, loginAsAdmin, closePool } = require('./helpers');

describe('Payments API Integration', () => {
  let token;
  let regionId;
  let categoryId;
  let paymentMethodId;
  let customerId;
  let billingPeriodId;
  let billId;

  beforeAll(async () => {
    await cleanupTestData();
    const seedData = await seedTestData();
    token = await loginAsAdmin(request(app));
    regionId = seedData.regionId;
    categoryId = seedData.categoryId;
    paymentMethodId = seedData.paymentMethodId;

    const customerRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerNumber: 'TST-PAY-001',
        fullName: 'Payment Test Customer',
        nik: '1234567890123457',
        regionId,
        categoryId,
        startDate: '2024-01-01'
      });
    customerId = customerRes.body.data.id;

    const periodRes = await request(app)
      .post('/api/v1/billing-periods')
      .set('Authorization', `Bearer ${token}`)
      .send({
        year: 2024,
        month: 6,
        periodCode: '2024-06',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        status: 'open'
      });
    billingPeriodId = periodRes.body.data ? periodRes.body.data.id : null;

    if (periodRes.body.data) {
      billingPeriodId = periodRes.body.data.id;
    }
  });

  afterAll(async () => {
    await cleanupTestData();
    await closePool();
  });

  describe('POST /api/v1/payments', () => {
    it('validates payment payload', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/payments', () => {
    it('returns payments list', async () => {
      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/payments');
      expect(res.status).toBe(401);
    });
  });
});
