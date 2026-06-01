const request = require('supertest');
const app = require('../../src/app');
const { cleanupTestData, seedTestData, loginAsAdmin, closePool } = require('./helpers');

describe('Regions API Integration', () => {
  let token;

  beforeAll(async () => {
    await cleanupTestData();
    await seedTestData();
    token = await loginAsAdmin(request(app));
  });

  afterAll(async () => {
    await cleanupTestData();
    await closePool();
  });

  describe('GET /api/v1/regions', () => {
    it('returns regions list', async () => {
      const res = await request(app)
        .get('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.pagination).toBeDefined();
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/regions');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/regions/tree', () => {
    it('returns region tree', async () => {
      const res = await request(app)
        .get('/api/v1/regions/tree')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/regions', () => {
    it('creates a region', async () => {
      const res = await request(app)
        .post('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'TST-KEC-02',
          name: 'Test Kecamatan 2',
          level: 'kecamatan',
          status: 'active'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('TST-KEC-02');
      expect(res.body.data.name).toBe('Test Kecamatan 2');
      expect(res.body.data.status).toBe('active');
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects duplicate code', async () => {
      const res = await request(app)
        .post('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'TST-KEC-02',
          name: 'Duplicate',
          level: 'kecamatan'
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/regions/:id', () => {
    it('returns region by id', async () => {
      const listRes = await request(app)
        .get('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`);

      const regionId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/v1/regions/${regionId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(regionId);
    });

    it('returns 404 for non-existent region', async () => {
      const res = await request(app)
        .get('/api/v1/regions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/regions/:id', () => {
    it('updates a region', async () => {
      const listRes = await request(app)
        .get('/api/v1/regions')
        .set('Authorization', `Bearer ${token}`);

      const regionId = listRes.body.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/regions/${regionId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Region Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Region Name');
    });
  });
});
