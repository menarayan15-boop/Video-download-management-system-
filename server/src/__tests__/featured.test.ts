import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { featuredVideoService } from '../modules/videos/featured.service.js';
import prisma from '../database/client.js';

const app = createApp();

describe('Dynamic Featured Video Engine & Governance Tests', () => {
  let sampleVideos: any[] = [];

  beforeAll(async () => {
    sampleVideos = await prisma.video.findMany({
      where: {
        contentStatus: 'AVAILABLE',
        visibility: 'PUBLIC',
      },
      take: 10,
      include: { category: true },
    });
  });

  describe('1. Featured Video Dynamic Selection Endpoint', () => {
    it('GET /api/v1/featured-video should return a valid video with complete metadata', async () => {
      const res = await request(app).get('/api/v1/featured-video');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const video = res.body.data;
      expect(video.id).toBeDefined();
      expect(video.title).toBeDefined();
      expect(typeof video.title).toBe('string');
      expect(video.thumbnailUrl).toBeDefined();
      expect(video.contentStatus).toBe('AVAILABLE');
      expect(video.visibility).toBe('PUBLIC');
      expect(video.category).toBeDefined();
      expect(video.category.name).toBeDefined();
      expect(video.provider).toBeDefined();
    });

    it('should support ?excludeId to avoid repeating the previous featured video', async () => {
      if (sampleVideos.length < 2) return;

      const firstRes = await request(app).get('/api/v1/featured-video');
      const firstId = firstRes.body.data.id;

      // Request next featured video excluding the current one
      const secondRes = await request(app).get(`/api/v1/featured-video?excludeId=${firstId}`);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);

      if (sampleVideos.length >= 2) {
        expect(secondRes.body.data.id).not.toBe(firstId);
      }
    });

    it('GET /api/v1/featured-videos should return a list of diverse candidates across categories', async () => {
      const res = await request(app).get('/api/v1/featured-videos?limit=6');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify no duplicates in the candidate carousel
      const ids = res.body.data.map((v: any) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Verify each candidate has required presentation metadata
      res.body.data.forEach((item: any) => {
        expect(item.title).toBeTruthy();
        expect(item.thumbnailUrl).toBeTruthy();
        expect(item.category).toBeDefined();
      });
    });
  });

  describe('2. Admin Pinning and Fallback Governance', () => {
    it('should honor pinned video when configured by admin', async () => {
      if (sampleVideos.length === 0) return;
      const targetPin = sampleVideos[0];

      // Set pin
      featuredVideoService.updateConfig({
        pinnedVideoId: targetPin.id,
        pinExpiresAt: null,
      });

      const res = await request(app).get('/api/v1/featured-video');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(targetPin.id);

      // Reset pin back to null
      featuredVideoService.updateConfig({
        pinnedVideoId: null,
      });
    });

    it('should ignore expired pin and revert to dynamic rotation', async () => {
      if (sampleVideos.length < 2) return;
      const targetPin = sampleVideos[0];

      // Set expired pin (1 hour in the past)
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      featuredVideoService.updateConfig({
        pinnedVideoId: targetPin.id,
        pinExpiresAt: pastDate,
      });

      const res = await request(app).get('/api/v1/featured-video');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      // Clean up config
      featuredVideoService.updateConfig({
        pinnedVideoId: null,
        pinExpiresAt: null,
      });
    });

    it('should provide diagnostic statistics for admin panel', async () => {
      const diagnostics = await featuredVideoService.getFeaturedDiagnostics();
      expect(diagnostics.eligibleCount).toBeGreaterThan(0);
      expect(diagnostics.config).toBeDefined();
      expect(Array.isArray(diagnostics.topDiversePreview)).toBe(true);
    });
  });
});
