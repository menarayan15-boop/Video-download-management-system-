import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../database/client.js';

const app = createApp();

describe('Vyntra 12 Advanced Features Integration Tests', () => {
  let demoToken: string;
  let demoUserId: string;
  let sampleVideoId: string;
  let createdPlaylistId: string;
  let createdNoteId: string;
  let createdBookmarkId: string;
  let feedbackId: string;

  beforeAll(async () => {
    // Login with pre-seeded demo user
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ emailOrUsername: 'demo@vyntra.com', password: 'DemoUser2026!' });

    demoToken = loginRes.body.data.token;
    demoUserId = loginRes.body.data.user.id;

    // Fetch an available video
    const video = await prisma.video.findFirst({
      where: { visibility: 'PUBLIC', contentStatus: 'AVAILABLE' },
    });
    sampleVideoId = video?.id || '';
  });

  describe('Feature 1: Smart Personalized Recommendations & Feedback', () => {
    it('should return personalized recommendations for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/recommendations?limit=6')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should record user recommendation feedback (NOT_INTERESTED)', async () => {
      const res = await request(app)
        .post('/api/v1/recommendations/feedback')
        .set('Authorization', `Bearer ${demoToken}`)
        .send({
          videoId: sampleVideoId,
          feedbackType: 'NOT_INTERESTED',
          reason: 'Already watched elsewhere',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.feedbackType).toBe('NOT_INTERESTED');
      feedbackId = res.body.data.id;
    });

    it('should allow undoing recommendation feedback', async () => {
      const res = await request(app)
        .delete(`/api/v1/recommendations/feedback/${feedbackId}`)
        .set('Authorization', `Bearer ${demoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get and set preferred categories', async () => {
      const categories = await prisma.category.findMany({ take: 2 });
      const catIds = categories.map((c) => c.id);

      const setRes = await request(app)
        .put('/api/v1/recommendations/preferences')
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ categoryIds: catIds });

      expect(setRes.status).toBe(200);
      expect(setRes.body.success).toBe(true);

      const getRes = await request(app)
        .get('/api/v1/recommendations/preferences')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBe(catIds.length);
    });
  });

  describe('Feature 2: Continue Watching & Playback Progress', () => {
    it('should record watch progress and return it under continue-watching', async () => {
      // Record progress: 45 seconds watched, not completed
      const recordRes = await request(app)
        .post(`/api/v1/social/videos/${sampleVideoId}/watch-progress`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ progressSeconds: 45, completed: false });

      expect(recordRes.status).toBe(200);
      expect(recordRes.body.data.progressSeconds).toBe(45);

      // Fetch continue watching
      const cwRes = await request(app)
        .get('/api/v1/users/me/continue-watching')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(cwRes.status).toBe(200);
      expect(cwRes.body.success).toBe(true);
      const found = cwRes.body.data.find((v: any) => v.id === sampleVideoId);
      expect(found).toBeDefined();
      expect(found.progressSeconds).toBe(45);
    });

    it('should remove video from continue-watching', async () => {
      const removeRes = await request(app)
        .delete(`/api/v1/users/me/continue-watching/${sampleVideoId}`)
        .set('Authorization', `Bearer ${demoToken}`);

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.success).toBe(true);
    });
  });

  describe('Feature 3: Advanced Search, Autocomplete & Recent Searches', () => {
    it('should return autocomplete suggestions for query', async () => {
      const res = await request(app).get('/api/v1/search/autocomplete?q=space');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should save and retrieve recent search history', async () => {
      const saveRes = await request(app)
        .post('/api/v1/search/recent')
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ query: 'James Webb Telescope' });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.data.query).toBe('James Webb Telescope');

      const getRes = await request(app)
        .get('/api/v1/search/recent')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.some((s: any) => s.query === 'James Webb Telescope')).toBe(true);
    });

    it('should filter search results by duration and provider', async () => {
      const res = await request(app).get('/api/v1/search?provider=NASA&duration=all&page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.videos)).toBe(true);
    });
  });

  describe('Feature 4: Custom Playlists and Collections', () => {
    it('should create a custom playlist', async () => {
      const res = await request(app)
        .post('/api/v1/playlists')
        .set('Authorization', `Bearer ${demoToken}`)
        .send({
          title: 'Deep Space Discoveries',
          description: 'A personal curated playlist of space missions',
          isPrivate: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Deep Space Discoveries');
      expect(res.body.data.shareToken).toBeDefined();
      createdPlaylistId = res.body.data.id;
    });

    it('should add video item to playlist', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${createdPlaylistId}/items`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ videoId: sampleVideoId });

      expect(res.status).toBe(201);
      expect(res.body.data.videoId).toBe(sampleVideoId);
    });

    it('should prevent duplicate video additions to same playlist', async () => {
      const res = await request(app)
        .post(`/api/v1/playlists/${createdPlaylistId}/items`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ videoId: sampleVideoId });

      expect(res.status).toBe(409);
    });

    it('should retrieve single playlist with included videos', async () => {
      const res = await request(app).get(`/api/v1/playlists/${createdPlaylistId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].video.id).toBe(sampleVideoId);
    });
  });

  describe('Feature 5: Smart Learning Tools (Notes, Bookmarks, Study Helper)', () => {
    it('should create and retrieve timestamp bookmark', async () => {
      const createRes = await request(app)
        .post(`/api/v1/learning/${sampleVideoId}/bookmarks`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ timestampSeconds: 120, title: 'Key explanation starts' });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.timestampSeconds).toBe(120);
      createdBookmarkId = createRes.body.data.id;

      const getRes = await request(app)
        .get(`/api/v1/learning/${sampleVideoId}/bookmarks`)
        .set('Authorization', `Bearer ${demoToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.some((b: any) => b.id === createdBookmarkId)).toBe(true);
    });

    it('should create, edit, and retrieve personal video notes', async () => {
      const createRes = await request(app)
        .post(`/api/v1/learning/${sampleVideoId}/notes`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ content: 'Remember to review this section for exams', timestampSeconds: 95 });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.content).toBe('Remember to review this section for exams');
      createdNoteId = createRes.body.data.id;

      const editRes = await request(app)
        .patch(`/api/v1/learning/${sampleVideoId}/notes/${createdNoteId}`)
        .set('Authorization', `Bearer ${demoToken}`)
        .send({ content: 'Updated exam review note' });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.content).toBe('Updated exam review note');
    });

    it('should return study helper structured summary and revision questions', async () => {
      const res = await request(app).get(`/api/v1/learning/${sampleVideoId}/study-helper`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(Array.isArray(res.body.data.takeaways)).toBe(true);
      expect(Array.isArray(res.body.data.revisionQuestions)).toBe(true);
    });
  });

  describe('Feature 6 & 11: Viewing Preferences & Accessibility', () => {
    it('should get and update user preferences', async () => {
      const patchRes = await request(app)
        .patch('/api/v1/preferences')
        .set('Authorization', `Bearer ${demoToken}`)
        .send({
          preferredLanguage: 'hi',
          captionsEnabled: true,
          reducedMotion: true,
          fontSize: 'large',
          theme: 'dark',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.preferredLanguage).toBe('hi');
      expect(patchRes.body.data.fontSize).toBe('large');
      expect(patchRes.body.data.reducedMotion).toBe(true);

      const getRes = await request(app)
        .get('/api/v1/preferences')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.preferredLanguage).toBe('hi');
    });
  });

  describe('Feature 7: Notifications Dismissal & Clear All', () => {
    it('should dismiss individual notification and clear all', async () => {
      // Create a test notification
      const notif = await prisma.notification.create({
        data: {
          userId: demoUserId,
          type: 'SYSTEM',
          title: 'Welcome Feature Test',
          message: 'Testing notification center',
        },
      });

      const delOne = await request(app)
        .delete(`/api/v1/notifications/${notif.id}`)
        .set('Authorization', `Bearer ${demoToken}`);

      expect(delOne.status).toBe(200);

      const clearAll = await request(app)
        .delete('/api/v1/notifications')
        .set('Authorization', `Bearer ${demoToken}`);

      expect(clearAll.status).toBe(200);
    });
  });
});
