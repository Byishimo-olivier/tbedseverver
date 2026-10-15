import request from 'supertest';
import { createTestApp } from '../helpers/request.helper';
import { createTestUser, generateTestToken } from '../helpers/auth.helper';
import { seedTestProject } from '../helpers/db.helper';
import { validProjectData } from '../fixtures/projects.fixture';
import { ProjectStatus, ProjectType, UserRole } from '@/types/enums';
import mongoose from 'mongoose';

const app = createTestApp();

describe('Projects API', () => {
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateTestToken(testUser._id.toString(), UserRole.PROJECT_MANAGER);
  });

  describe('POST /api/v1/projects', () => {
    it('should create a project with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'API Test Project',
          projectDescription: 'Created via API test',
          status: ProjectStatus.PLANNING,
          type: ProjectType.CAPITAL,
          budget: 250000,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('API Test Project');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send(validProjectData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'A', // Too short
          budget: -100, // Invalid
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return project by ID', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data._id).toBe(project._id.toString());
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects/user/me', () => {
    it('should return user projects', async () => {
      await seedTestProject(testUser._id.toString(), { name: 'My Project 1' });
      await seedTestProject(testUser._id.toString(), { name: 'My Project 2' });

      const response = await request(app)
        .get('/api/v1/projects/user/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('should update project', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .patch(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Project Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated Project Name');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .delete(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/projects/:projectId/members', () => {
    it('should return project members', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}/members`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/projects/:projectId/documents', () => {
    it('should return project documents', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}/documents`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter documents by type', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}/documents`)
        .query({ type: 'project' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter documents by date range', async () => {
      const project = await seedTestProject(testUser._id.toString());

      const response = await request(app)
        .get(`/api/v1/projects/${project._id}/documents`)
        .query({ 
          startDate: '2024-01-01',
          endDate: '2025-12-31' 
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});