import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import prisma from '../database/client.js';
import { YouTubeProvider } from '../modules/discovery/providers/youtube.provider.js';
import { NasaProvider } from '../modules/discovery/providers/nasa.provider.js';
import { ArchiveProvider } from '../modules/discovery/providers/archive.provider.js';
import { discoveryService } from '../modules/discovery/discovery.service.js';

const app = createApp();

describe('Vyntra Multi-Source Content Discovery & Aggregation Engine Tests', () => {
  let sampleCategoryId = '';

  beforeAll(async () => {
    const cat = await prisma.category.findFirst({ where: { isActive: true } });
    if (cat) {
      sampleCategoryId = cat.id;
    }
  });

  describe('1. Dynamic Category & Subcategory Architecture', () => {
    it('should retrieve all 20+ active categories with subcategories and video counts', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(20);

      const techCat = res.body.data.find((c: any) => c.slug === 'technology-ai');
      expect(techCat).toBeDefined();
      expect(techCat.subcategories.length).toBeGreaterThan(0);
      expect(techCat._count).toBeDefined();
    });

    it('should retrieve category by slug with child subcategories', async () => {
      const res = await request(app).get('/api/v1/categories/space-astronomy');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('space-astronomy');
      expect(res.body.data.subcategories.length).toBeGreaterThan(0);
    });
  });

  describe('2. Unified Search & Faceted Filtering', () => {
    it('should search videos by query keyword with pagination', async () => {
      const res = await request(app).get('/api/v1/search?q=intelligence&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.videos)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
    });

    it('should filter videos by category and provider', async () => {
      const res = await request(app).get('/api/v1/search?provider=YOUTUBE&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.videos.forEach((video: any) => {
        expect(video.provider).toBe('YOUTUBE');
      });
    });
  });

  describe('3. Provider Normalization & Deduplication Safeguards', () => {
    it('should verify provider configuration statuses', async () => {
      const res = await request(app).get('/api/v1/providers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const yt = res.body.data.find((p: any) => p.providerType === 'YOUTUBE');
      const nasa = res.body.data.find((p: any) => p.providerType === 'NASA');
      expect(yt).toBeDefined();
      expect(nasa).toBeDefined();
      expect(yt.isConfigured).toBe(true);
      expect(nasa.isConfigured).toBe(true);
    });

    it('should prevent duplicate video imports on provider + providerVideoId', async () => {
      const testVidId = `test_dedup_${Date.now()}`;
      const mockMeta = {
        provider: 'YOUTUBE' as const,
        providerVideoId: testVidId,
        title: 'Deduplication Test Video',
        description: 'Testing deduplication constraint in Neon DB',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        playbackType: 'EMBED_YOUTUBE' as const,
        embedUrl: `https://www.youtube.com/embed/${testVidId}`,
        originalUrl: `https://www.youtube.com/watch?v=${testVidId}`,
        durationSeconds: 120,
        creatorName: 'Test Creator',
        publishedAt: new Date(),
        rightsStatus: 'EMBED_PERMITTED' as const,
        attributionText: 'Test Attribution',
        tags: ['test'],
      };

      // Import once
      const firstSave = await discoveryService.saveNormalizedVideo(mockMeta, sampleCategoryId);
      expect(firstSave.imported).toBe(true);

      // Import twice with updated title
      mockMeta.title = 'Updated Title on Duplicate';
      const secondSave = await discoveryService.saveNormalizedVideo(mockMeta, sampleCategoryId);
      expect(secondSave.imported).toBe(true);
      expect(secondSave.videoId).toBe(firstSave.videoId);

      // Verify only 1 record exists in DB
      const count = await prisma.video.count({
        where: { provider: 'YOUTUBE', providerVideoId: testVidId },
      });
      expect(count).toBe(1);

      // Clean up
      await prisma.video.delete({ where: { id: firstSave.videoId } }).catch(() => {});
    });

    it('should enforce downloadAllowed = false for external videos', async () => {
      const testVidId = `test_security_${Date.now()}`;
      const mockExternal = {
        provider: 'YOUTUBE' as const,
        providerVideoId: testVidId,
        title: 'Security Enforcement Video',
        description: 'Ensuring YouTube downloads are blocked',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        playbackType: 'EMBED_YOUTUBE' as const,
        originalUrl: `https://www.youtube.com/watch?v=${testVidId}`,
        durationSeconds: 90,
        creatorName: 'Security Channel',
        publishedAt: new Date(),
        rightsStatus: 'EMBED_PERMITTED' as const,
        attributionText: 'Attribution',
        tags: [],
      };

      const result = await discoveryService.saveNormalizedVideo(mockExternal, sampleCategoryId);
      const saved = await prisma.video.findUnique({ where: { id: result.videoId } });
      expect(saved?.downloadAllowed).toBe(false);

      await prisma.video.delete({ where: { id: result.videoId } }).catch(() => {});
    });
  });

  describe('4. Administrative Governance & Role-Based Security', () => {
    it('should reject unauthenticated calls to admin discovery sync', async () => {
      const res = await request(app).post('/api/v1/admin/discovery/sync').send({});
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated calls to admin category creation', async () => {
      const res = await request(app).post('/api/v1/admin/discovery/categories').send({
        name: 'Unauth Category',
        slug: 'unauth-cat',
      });
      expect(res.status).toBe(401);
    });
  });
});
