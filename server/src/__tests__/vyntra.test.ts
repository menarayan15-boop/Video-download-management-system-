import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../database/client.js';

const app = createApp();

describe('Vyntra Full-Stack Platform Integration & Quota Engine Tests', () => {
  const testUsername = `tester_${Date.now()}`;
  const testEmail = `${testUsername}@vyntra.test`;
  const testPassword = 'Password123!';
  let authToken = '';
  let testUserId = '';
  let testVideoId = '';

  beforeAll(async () => {
    // Get downloadable sample video from database
    const video = await prisma.video.findFirst({
      where: { downloadAllowed: true },
    });
    if (video) {
      testVideoId = video.id;
    }
  });

  afterAll(async () => {
    // Clean up test user & related records
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe('1. Authentication & Security', () => {
    it('should register a new user and auto-assign active FREE subscription', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: testUsername,
          email: testEmail,
          password: testPassword,
          role: 'USER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.token).toBeDefined();

      authToken = res.body.data.token;
      testUserId = res.body.data.user.id;

      // Verify active subscription in DB
      const sub = await prisma.userSubscription.findFirst({
        where: { userId: testUserId, status: 'ACTIVE' },
        include: { plan: true },
      });
      expect(sub).toBeDefined();
      expect(sub?.plan.name).toBe('FREE');
    });

    it('should fail registration with duplicate username/email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: testUsername,
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('2. Subscriptions & Plans', () => {
    it('should list all active subscription plans', async () => {
      const res = await request(app).get('/api/v1/subscriptions/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);

      const freePlan = res.body.data.find((p: any) => p.name === 'FREE');
      expect(freePlan).toBeDefined();
      expect(freePlan.downloadLimit).toBe(1); // 1 download per day rule
    });

    it('should return live user quota summary (1 download available for Free tier)', async () => {
      const res = await request(app)
        .get('/api/v1/downloads/quota')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.planName).toBe('FREE');
      expect(res.body.data.downloadLimit).toBe(1);
      expect(res.body.data.remaining).toBe(1);
    });
  });

  describe('3. Concurrency-Safe Download Quota Engine', () => {
    const idempotencyKey1 = `test_key_${Date.now()}_1`;
    let firstOperationId = '';

    it('should allow first download request and reserve 1 quota unit', async () => {
      const res = await request(app)
        .post('/api/v1/downloads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoId: testVideoId,
          idempotencyKey: idempotencyKey1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.operation.status).toBe('RESERVED');
      expect(res.body.data.downloadToken).toBeDefined();

      firstOperationId = res.body.data.operation.id;

      // Quota remaining should now be 0
      const quotaRes = await request(app)
        .get('/api/v1/downloads/quota')
        .set('Authorization', `Bearer ${authToken}`);

      expect(quotaRes.body.data.reserved).toBe(1);
      expect(quotaRes.body.data.remaining).toBe(0);
    });

    it('should return existing operation for duplicate idempotency key without recharging quota', async () => {
      const res = await request(app)
        .post('/api/v1/downloads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoId: testVideoId,
          idempotencyKey: idempotencyKey1, // Duplicate key!
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isExisting).toBe(true);
      expect(res.body.data.operation.id).toBe(firstOperationId);
    });

    it('should block second download request in same daily period with 429 QUOTA_EXHAUSTED', async () => {
      const idempotencyKey2 = `test_key_${Date.now()}_2`;
      const res = await request(app)
        .post('/api/v1/downloads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          videoId: testVideoId,
          idempotencyKey: idempotencyKey2,
        });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('QUOTA_EXHAUSTED');
      expect(res.body.error).toContain('Download quota exceeded for your FREE plan');
    });

    it('should release reserved quota upon cancellation', async () => {
      const cancelRes = await request(app)
        .post(`/api/v1/downloads/${firstOperationId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cancelRes.status).toBe(200);

      // Quota should now be freed back to 1
      const quotaRes = await request(app)
        .get('/api/v1/downloads/quota')
        .set('Authorization', `Bearer ${authToken}`);

      expect(quotaRes.body.data.reserved).toBe(0);
      expect(quotaRes.body.data.remaining).toBe(1);
    });
  });
});
