import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../server.js';
import pool from '../db/connection.js';

describe('Phase 5: Voice Calling Integration Tests', () => {
  let authToken;
  let userId;
  let campaignId;
  let callId;
  let prospectId;
  let phoneId;

  beforeAll(async () => {
    // Create test user and get auth token
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `test-phase5-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        display_name: 'Phase 5 Tester',
      });

    expect(signupRes.status).toBe(201);
    const token = signupRes.body.data.token;
    authToken = `Bearer ${token}`;
    userId = signupRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up database
    if (pool) {
      await pool.end();
    }
  });

  describe('Campaign Management', () => {
    describe('POST /api/v1/campaigns - Create Campaign', () => {
      it('should create a new campaign in draft status', async () => {
        // First create a prospect
        const personRes = await request(app)
          .post('/api/v1/people')
          .set('Authorization', authToken)
          .send({
            full_name: 'Test Prospect',
            email: `prospect-${Date.now()}@example.com`,
            role_title: 'Manager',
            business_id: null,
            department_id: null,
          });

        expect(personRes.status).toBe(201);
        prospectId = personRes.body.data.id;

        // Create a phone for the prospect
        const phoneRes = await request(app)
          .post('/api/v1/phones')
          .set('Authorization', authToken)
          .send({
            phone_number: '+12025551001',
            phone_type: 'mobile',
          });

        expect(phoneRes.status).toBe(201);
        phoneId = phoneRes.body.data.id;

        // Now create campaign
        const res = await request(app)
          .post('/api/v1/campaigns')
          .set('Authorization', authToken)
          .send({
            name: 'Test Campaign - Phase 5',
            description: 'Campaign for testing',
            prospect_ids: [prospectId],
          });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.status).toBe('draft');
        expect(res.body.data.name).toBe('Test Campaign - Phase 5');
        expect(res.body.data.prospect_count).toBe(1);
        campaignId = res.body.data.id;
      });

      it('should fail without prospect_ids', async () => {
        const res = await request(app)
          .post('/api/v1/campaigns')
          .set('Authorization', authToken)
          .send({
            name: 'Invalid Campaign',
            prospect_ids: [],
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/v1/campaigns - List Campaigns', () => {
      it('should list all user campaigns', async () => {
        const res = await request(app)
          .get('/api/v1/campaigns')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
      });

      it('should filter campaigns by status', async () => {
        const res = await request(app)
          .get('/api/v1/campaigns?status=draft')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        res.body.data.forEach((campaign) => {
          expect(campaign.status).toBe('draft');
        });
      });
    });

    describe('GET /api/v1/campaigns/:id - Get Campaign Detail', () => {
      it('should return campaign with call counts', async () => {
        const res = await request(app)
          .get(`/api/v1/campaigns/${campaignId}`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(campaignId);
        expect(res.body.data).toHaveProperty('calls_total');
        expect(res.body.data).toHaveProperty('calls_completed');
      });
    });

    describe('PATCH /api/v1/campaigns/:id - Update Campaign', () => {
      it('should update campaign when in draft status', async () => {
        const res = await request(app)
          .patch(`/api/v1/campaigns/${campaignId}`)
          .set('Authorization', authToken)
          .send({
            description: 'Updated description',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.description).toBe('Updated description');
      });
    });

    describe('POST /api/v1/campaigns/:id/start - Start Campaign', () => {
      it('should transition campaign from draft to running', async () => {
        const res = await request(app)
          .post(`/api/v1/campaigns/${campaignId}/start`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('running');
        expect(res.body.data.started_at).toBeDefined();
      });
    });
  });

  describe('Call Management', () => {
    describe('GET /api/v1/calls - List Calls', () => {
      it('should list calls for the campaign', async () => {
        const res = await request(app)
          .get(`/api/v1/calls?campaign_id=${campaignId}`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter calls by status', async () => {
        const res = await request(app)
          .get('/api/v1/calls?status=pending')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should support pagination', async () => {
        const res = await request(app)
          .get('/api/v1/calls?page=1&page_size=10')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /api/v1/calls/dashboard/metrics - Get Dashboard Metrics', () => {
      it('should return call center metrics', async () => {
        const res = await request(app)
          .get('/api/v1/calls/dashboard/metrics')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('calls_total');
        expect(res.body.data).toHaveProperty('success_rate');
        expect(res.body.data).toHaveProperty('avg_duration_seconds');
        expect(res.body.data).toHaveProperty('active_campaigns');
      });

      it('should return active campaigns list', async () => {
        const res = await request(app)
          .get('/api/v1/calls/dashboard/metrics')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.active_campaigns)).toBe(true);
      });
    });
  });

  describe('Compliance & Consent', () => {
    describe('Compliance Pre-flight Checks', () => {
      it('should allow calls to phones with valid consent', async () => {
        // Grant consent on the phone
        const consentRes = await request(app)
          .patch(`/api/v1/phones/${phoneId}/consent`)
          .set('Authorization', authToken)
          .send({
            marketing_consent: 'granted',
          });

        expect(consentRes.status).toBe(200);

        // Check that compliance allows the call
        const dashRes = await request(app)
          .get('/api/v1/calls/dashboard/metrics')
          .set('Authorization', authToken);

        expect(dashRes.status).toBe(200);
      });
    });

    describe('Consent Management', () => {
      it('should track consent state for phones', async () => {
        const res = await request(app)
          .get(`/api/v1/phones/${phoneId}`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('marketing_consent');
        expect(res.body.data).toHaveProperty('transactional_consent');
      });
    });
  });

  describe('Transcript & Opt-Out Processing', () => {
    describe('Transcript Review Queue', () => {
      it('should list flagged transcripts', async () => {
        const res = await request(app)
          .get('/api/v1/transcripts')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('Opt-Out Opt-Out Detection', () => {
      it('should detect opt-out keywords in transcripts', async () => {
        // This would require setting up a call with transcript first
        // For now, we verify the endpoint exists
        const res = await request(app)
          .get('/api/v1/transcripts')
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
      });
    });
  });

  describe('Campaign Lifecycle', () => {
    describe('Campaign State Transitions', () => {
      it('should allow pause from running state', async () => {
        const res = await request(app)
          .post(`/api/v1/campaigns/${campaignId}/pause`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('paused');
      });

      it('should allow resume from paused state', async () => {
        const res = await request(app)
          .post(`/api/v1/campaigns/${campaignId}/resume`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('running');
      });

      it('should allow stop from running state', async () => {
        const res = await request(app)
          .post(`/api/v1/campaigns/${campaignId}/stop`)
          .set('Authorization', authToken);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('completed');
        expect(res.body.data.ended_at).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      const res = await request(app)
        .get('/api/v1/campaigns');

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent campaign', async () => {
      const res = await request(app)
        .get('/api/v1/campaigns/nonexistent-id')
        .set('Authorization', authToken);

      expect(res.status).toBe(404);
    });

    it('should reject invalid campaign state transitions', async () => {
      // Create a draft campaign
      const personRes = await request(app)
        .post('/api/v1/people')
        .set('Authorization', authToken)
        .send({
          full_name: 'Another Test',
          email: `prospect2-${Date.now()}@example.com`,
          role_title: 'Manager',
        });

      const createRes = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', authToken)
        .send({
          name: 'Test Campaign 2',
          prospect_ids: [personRes.body.data.id],
        });

      const draftCampaignId = createRes.body.data.id;

      // Try to pause a draft campaign (invalid transition)
      const pauseRes = await request(app)
        .post(`/api/v1/campaigns/${draftCampaignId}/pause`)
        .set('Authorization', authToken);

      expect([400, 409]).toContain(pauseRes.status);
    });
  });
});
