import request from 'supertest';
import app from '../src/server.js';

describe('Phone List API - Integration Tests', () => {
  let authToken;
  let testPhoneId;

  describe('Authentication', () => {
    test('POST /auth/signup - Create new account', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'TestPassword123!',
          display_name: 'Test User',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('user');
      authToken = response.body.data.access_token;
    });

    test('POST /auth/signup - Duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'TestPassword123!',
          display_name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    test('POST /auth/signin - Valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'newuser@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('access_token');
      authToken = response.body.data.access_token;
    });

    test('POST /auth/signin - Invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'newuser@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('POST /auth/signout - Logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('Phone Management', () => {
    beforeAll(async () => {
      // Signin to get token for all phone tests
      const signinResponse = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        });

      authToken = signinResponse.body.data.access_token;
    });

    test('GET /phones - List phones', async () => {
      const response = await request(app)
        .get('/api/v1/phones')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total_items');
    });

    test('POST /phones - Create phone', async () => {
      const response = await request(app)
        .post('/api/v1/phones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          e164_number: '+5511999887766',
          raw_number: '(11) 99988-7766',
          type: 'mobile',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.e164_number).toBe('+5511999887766');
      testPhoneId = response.body.data.id;
    });

    test('POST /phones - Invalid phone format', async () => {
      const response = await request(app)
        .post('/api/v1/phones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          e164_number: 'invalid',
          type: 'mobile',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('GET /phones/:id - Get phone details', async () => {
      const response = await request(app)
        .get(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testPhoneId);
      expect(response.body.data.owners).toBeInstanceOf(Array);
    });

    test('PATCH /phones/:id - Update phone', async () => {
      const response = await request(app)
        .patch(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'whatsapp',
          status: 'inactive',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.type).toBe('whatsapp');
      expect(response.body.data.status).toBe('inactive');
    });

    test('DELETE /phones/:id - Delete phone', async () => {
      const response = await request(app)
        .delete(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    test('GET /phones/:id - Not found after delete', async () => {
      const response = await request(app)
        .get(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Authorization', () => {
    test('GET /phones - No token', async () => {
      const response = await request(app).get('/api/v1/phones');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('GET /phones - Invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/phones')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    test('GET /phones - Malformed header', async () => {
      const response = await request(app)
        .get('/api/v1/phones')
        .set('Authorization', 'NotBearer token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    test('GET /invalid - Not found', async () => {
      const response = await request(app).get('/api/v1/invalid');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('Error response format', async () => {
      const response = await request(app)
        .get('/api/v1/phones/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('request_id');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });

  describe('Health Check', () => {
    test('GET /health - Server is running', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });
});
