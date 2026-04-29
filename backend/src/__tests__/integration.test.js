import request from 'supertest';
import app from '../server.js';

describe('Phone List API - Full Integration Tests', () => {
  let authToken;
  let userId;
  let testPhoneId;
  let testPersonId;

  const testUser = {
    email: `testuser-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    display_name: 'Test Integration User',
  };

  const existingUser = {
    email: 'test@example.com',
    password: 'Password123!',
  };

  describe('1. Authentication - Signup & Signin', () => {
    test('POST /auth/signup - Should create new account', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
      authToken = response.body.data.access_token;
      userId = response.body.data.user.id;
    });

    test('POST /auth/signup - Should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(testUser);

      expect(response.status).toBe(409);
    });

    test('POST /auth/signup - Should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: `weak-${Date.now()}@example.com`,
          password: 'weak',
          display_name: 'User',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('POST /auth/signin - Should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('access_token');
      authToken = response.body.data.access_token;
    });

    test('POST /auth/signin - Should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    });

    test('POST /auth/signin - Should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('2. Password Recovery', () => {
    test('POST /auth/forgot-password - Should send reset token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: testUser.email,
        });

      expect(response.status).toBe(200);
    });

    test('POST /auth/forgot-password - Should handle non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200); // Security: don't leak user existence
    });
  });

  describe('3. Phones - CRUD Operations', () => {
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send(existingUser);
      authToken = response.body.data.access_token;
    });

    test('POST /phones - Should create phone ', async () => {
      const response = await request(app)
        .post('/api/v1/phones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          e164_number: '+5511999887766',
          raw_number: '(11) 99988-7766',
          phone_type: 'mobile',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.e164_number).toBe('+5511999887766');
      testPhoneId = response.body.data.id;
    });

    test('GET /phones - Should list phones with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/phones?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total_items');
    });

    test('GET /phones - Should search by number', async () => {
      const response = await request(app)
        .get('/api/v1/phones?search=99988')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /phones - Should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/phones?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(phone => {
        expect(phone.status).toBe('active');
      });
    });

    test('GET /phones/:id - Should get phone with owners', async () => {
      if (!testPhoneId) return;

      const response = await request(app)
        .get(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testPhoneId);
    });

    test('PATCH /phones/:id - Should update phone', async () => {
      if (!testPhoneId) return;

      const response = await request(app)
        .patch(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'inactive',
        });

      expect(response.status).toBe(200);
    });

    test('DELETE /phones/:id - Should soft delete', async () => {
      if (!testPhoneId) return;

      const response = await request(app)
        .delete(`/api/v1/phones/${testPhoneId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });
  });

  describe('4. People - CRUD Operations', () => {
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/auth/signin')
        .send(existingUser);
      authToken = response.body.data.access_token;
    });

    test('POST /people - Should create person', async () => {
      const response = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          email: `john-${Date.now()}@example.com`,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      testPersonId = response.body.data.id;
    });

    test('GET /people - Should list people', async () => {
      const response = await request(app)
        .get('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /people/:id - Should get person', async () => {
      if (!testPersonId) return;

      const response = await request(app)
        .get(`/api/v1/people/${testPersonId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    test('PATCH /people/:id - Should update person', async () => {
      if (!testPersonId) return;

      const response = await request(app)
        .patch(`/api/v1/people/${testPersonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ last_name: 'Smith' });

      expect(response.status).toBe(200);
    });
  });

  describe('5. Phone Owners - Relations', () => {
    let phoneId, personId;

    beforeAll(async () => {
      const signinResponse = await request(app)
        .post('/api/v1/auth/signin')
        .send(existingUser);
      authToken = signinResponse.body.data.access_token;

      // Create test phone
      const phoneResponse = await request(app)
        .post('/api/v1/phones')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          e164_number: `+551${Date.now() % 1000000000}`,
          raw_number: `(11) ${Date.now() % 1000000000}`,
          phone_type: 'mobile',
        });
      phoneId = phoneResponse.body.data?.id;

      // Create test person
      const personResponse = await request(app)
        .post('/api/v1/people')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Owner',
          last_name: 'Test',
          email: `owner-${Date.now()}@example.com`,
        });
      personId = personResponse.body.data?.id;
    });

    test('POST /phone-owners - Should add owner', async () => {
      if (!phoneId || !personId) return;

      const response = await request(app)
        .post('/api/v1/phone-owners')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone_id: phoneId,
          owner_type: 'person',
          owner_id: personId,
          confidence_score: 95,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('6. Authentication - Token & Authorization', () => {
    test('Should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/v1/phones');

      expect(response.status).toBe(401);
    });

    test('Should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/phones')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
    });

    test('POST /auth/signout - Should logout', async () => {
      const signinResponse = await request(app)
        .post('/api/v1/auth/signin')
        .send(existingUser);
      const token = signinResponse.body.data.access_token;

      const logoutResponse = await request(app)
        .post('/api/v1/auth/signout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutResponse.status).toBe(204);
    });
  });

  describe('7. Error Handling', () => {
    test('GET /health - Server healthy', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });

    test('GET /nonexistent - Should return 404', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});
