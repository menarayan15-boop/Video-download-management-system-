import { Router, Request, Response } from 'express';
import { discoveryService } from './discovery.service.js';
import { providerRegistry } from './providers/provider.registry.js';
import prisma from '../../database/client.js';
import { authenticate, requireAuth, requireRole, AuthRequest } from '../../middleware/auth.js';
import { ContentProviderType, ContentStatus } from './types.js';

export const discoveryRouter = Router();

// ==========================================
// PUBLIC DISCOVERY ENDPOINTS
// ==========================================

/**
 * GET /api/v1/categories
 * Returns active categories with subcategories & video counts
 */
discoveryRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await discoveryService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/categories/:slug
 * Returns a specific category by slug with its subcategories
 */
discoveryRouter.get('/categories/:slug', async (req: Request, res: Response) => {
  try {
    const category = await discoveryService.getCategoryBySlug(req.params.slug);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/categories/:slug/videos
 * Returns paginated videos for a category
 */
discoveryRouter.get('/categories/:slug/videos', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { subcategory, provider, sortBy, page, limit } = req.query;

    let subcategoryId: string | undefined;
    if (subcategory) {
      const sub = await prisma.subcategory.findFirst({
        where: { categoryId: category.id, slug: String(subcategory) },
      });
      if (sub) subcategoryId = sub.id;
    }

    const results = await discoveryService.search({
      query: '',
      categoryId: category.id,
      subcategoryId,
      provider: provider ? (String(provider).toUpperCase() as ContentProviderType) : undefined,
      sortBy: sortBy as any,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 18,
    });

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/search
 * Unified video discovery search with multi-faceted filtering
 */
discoveryRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      q,
      categoryId,
      subcategoryId,
      provider,
      sortBy,
      duration,
      dateRange,
      language,
      playbackType,
      page,
      limit,
    } = req.query;

    const results = await discoveryService.search({
      query: String(q || ''),
      categoryId: categoryId ? String(categoryId) : undefined,
      subcategoryId: subcategoryId ? String(subcategoryId) : undefined,
      provider: provider ? (String(provider).toUpperCase() as ContentProviderType) : undefined,
      sortBy: sortBy as any,
      duration: duration as any,
      dateRange: dateRange as any,
      language: language ? String(language) : undefined,
      playbackType: playbackType ? String(playbackType) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 24,
    });

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/search/autocomplete
 * Fast autocomplete search suggestions
 */
discoveryRouter.get('/search/autocomplete', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '');
    const suggestions = await discoveryService.autocomplete(q);
    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/search/recent
 * Retrieve recent searches for authenticated user
 */
discoveryRouter.get('/search/recent', authenticate, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const searches = await discoveryService.getRecentSearches(req.user!.id);
    res.json({ success: true, data: searches });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/search/recent
 * Save recent search query
 */
discoveryRouter.post('/search/recent', authenticate, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.body;
    const saved = await discoveryService.saveRecentSearch(req.user!.id, query);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/v1/search/recent/:id
 * Delete single recent search
 */
discoveryRouter.delete('/search/recent/:id', authenticate, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await discoveryService.deleteRecentSearch(req.user!.id, req.params.id);
    res.json({ success: true, message: 'Search history entry deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/v1/search/recent
 * Clear all recent searches
 */
discoveryRouter.delete('/search/recent', authenticate, requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await discoveryService.clearRecentSearches(req.user!.id);
    res.json({ success: true, message: 'Search history cleared' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/providers
 * Returns supported video providers and configured state
 */
discoveryRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const statuses = await providerRegistry.getAllStatuses();
    res.json({ success: true, data: statuses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/providers/:type/status
 */
discoveryRouter.get('/providers/:type/status', async (req: Request, res: Response) => {
  try {
    const provider = providerRegistry.get(req.params.type.toUpperCase() as ContentProviderType);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    const status = await provider.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/videos/:id/verify
 * Verifies external video availability
 */
discoveryRouter.post('/videos/:id/verify', async (req: Request, res: Response) => {
  try {
    const isAvailable = await discoveryService.verifyVideoStatus(req.params.id);
    res.json({ success: true, isAvailable });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// PROTECTED ADMINISTRATIVE ENDPOINTS
// ==========================================

export const adminDiscoveryRouter = Router();
adminDiscoveryRouter.use(authenticate, requireRole(['ADMIN']));

/**
 * GET /api/v1/admin/discovery/stats
 */
adminDiscoveryRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await discoveryService.getDiscoveryStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/admin/discovery/jobs
 */
adminDiscoveryRouter.get('/jobs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || 20), 10);
    const jobs = await prisma.contentSyncJob.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
    });
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/discovery/sync
 * Manually trigger discovery sync for a specific category or all
 */
adminDiscoveryRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const { categoryId, limitPerCategory } = req.body;

    if (categoryId) {
      const result = await discoveryService.syncCategory(categoryId, { limitPerCategory: limitPerCategory || 10 });
      return res.json({ success: true, message: 'Sync completed for category', data: result });
    }

    // Sync all active categories asynchronously
    const categories = await prisma.category.findMany({ where: { isActive: true }, take: 6 });
    let totalImported = 0;
    let totalDiscovered = 0;

    for (const cat of categories) {
      try {
        const res = await discoveryService.syncCategory(cat.id, { limitPerCategory: 5 });
        totalImported += res.imported;
        totalDiscovered += res.discovered;
      } catch (e: any) {
        console.error(`Admin sync error on ${cat.name}:`, e.message);
      }
    }

    res.json({
      success: true,
      message: `Sync completed across ${categories.length} categories.`,
      data: { totalDiscovered, totalImported },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/admin/providers
 */
adminDiscoveryRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = await prisma.videoProvider.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: providers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/admin/providers/:id
 */
adminDiscoveryRouter.patch('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { isEnabled, configuration } = req.body;
    const updated = await prisma.videoProvider.update({
      where: { id: req.params.id },
      data: {
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
        configuration: configuration ? JSON.stringify(configuration) : undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/categories
 * Dynamically create a new category
 */
adminDiscoveryRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, displayOrder } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Name and slug are required' });
    }

    const created = await prisma.category.create({
      data: {
        name,
        slug: slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        description,
        icon: icon || 'Film',
        displayOrder: displayOrder ? parseInt(String(displayOrder), 10) : 0,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/admin/categories/:id
 * Rename, reorder, or toggle active state of a category
 */
adminDiscoveryRouter.patch('/categories/:id', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, icon, displayOrder, isActive } = req.body;
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name,
        slug,
        description,
        icon,
        displayOrder: displayOrder !== undefined ? parseInt(String(displayOrder), 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/admin/subcategories
 * Dynamically add a subcategory
 */
adminDiscoveryRouter.post('/subcategories', async (req: Request, res: Response) => {
  try {
    const { categoryId, name, slug, displayOrder } = req.body;
    if (!categoryId || !name || !slug) {
      return res.status(400).json({ success: false, message: 'categoryId, name and slug are required' });
    }

    const created = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        slug: slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        displayOrder: displayOrder ? parseInt(String(displayOrder), 10) : 0,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/admin/subcategories/:id
 */
adminDiscoveryRouter.patch('/subcategories/:id', async (req: Request, res: Response) => {
  try {
    const { name, slug, displayOrder, isActive } = req.body;
    const updated = await prisma.subcategory.update({
      where: { id: req.params.id },
      data: {
        name,
        slug,
        displayOrder: displayOrder !== undefined ? parseInt(String(displayOrder), 10) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/admin/videos/:id/status
 * Moderate video: AVAILABLE, HIDDEN, FLAGGED, UNAVAILABLE
 */
adminDiscoveryRouter.patch('/videos/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, reason } = req.body;
    const updated = await prisma.video.update({
      where: { id: req.params.id },
      data: {
        contentStatus: status as ContentStatus,
      },
    });

    await prisma.videoSourceEvent.create({
      data: {
        videoId: req.params.id,
        eventType: 'ADMIN_STATUS_CHANGED',
        details: JSON.stringify({ newStatus: status, reason: reason || 'Admin moderation action' }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
