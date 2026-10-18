import prisma from '../../database/client.js';
import { providerRegistry } from './providers/provider.registry.js';
import { CATEGORIES_DEFINITION } from './category.constants.js';
import {
  ContentProviderType,
  ContentStatus,
  NormalizedVideoMetadata,
  SyncOptions,
} from './types.js';

export class DiscoveryService {
  /**
   * Initializes all 20 required categories and subcategories into Neon PostgreSQL.
   */
  async seedCategoriesAndProviders(force = false): Promise<void> {
    const existingCount = await prisma.category.count();
    if (!force && existingCount >= 20) {
      console.log(`✅ All ${existingCount} categories verified in Neon database.`);
      return;
    }

    console.log('🔄 Seeding Vyntra categories, subcategories, and providers...');

    // 1. Seed Providers
    const providersToSeed = [
      { name: 'YouTube Data API v3', type: 'YOUTUBE' as const },
      { name: 'NASA Open Media & APIs', type: 'NASA' as const },
      { name: 'Internet Archive', type: 'ARCHIVE' as const },
    ];

    for (const p of providersToSeed) {
      await prisma.videoProvider.upsert({
        where: { providerType: p.type },
        update: { name: p.name, isEnabled: true },
        create: {
          name: p.name,
          providerType: p.type,
          isEnabled: true,
          configuration: JSON.stringify({ rateLimitPerMin: 60 }),
        },
      });
    }

    // 2. Seed 20 Categories and their Subcategories
    for (const cat of CATEGORIES_DEFINITION) {
      const category = await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
        create: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
      });

      // Subcategories
      for (let i = 0; i < cat.subcategories.length; i++) {
        const sub = cat.subcategories[i];
        await prisma.subcategory.upsert({
          where: {
            categoryId_slug: {
              categoryId: category.id,
              slug: sub.slug,
            },
          },
          update: {
            name: sub.name,
            displayOrder: i + 1,
            isActive: true,
          },
          create: {
            categoryId: category.id,
            name: sub.name,
            slug: sub.slug,
            displayOrder: i + 1,
            isActive: true,
          },
        });
      }
    }

    console.log('✅ Successfully seeded categories, subcategories, and provider records.');
  }

  /**
   * Discovers and imports videos for a specific category using its preferred provider.
   */
  async syncCategory(categoryId: string, options: SyncOptions = {}): Promise<{
    discovered: number;
    imported: number;
    skipped: number;
  }> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subcategories: { where: { isActive: true } } },
    });

    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const catDef = CATEGORIES_DEFINITION.find((c) => c.slug === category.slug);
    const providerType = catDef?.preferredProvider || 'YOUTUBE';
    const provider = providerRegistry.get(providerType);

    if (!provider || !provider.isConfigured) {
      // Fallback to another configured provider if available
      const fallbackProvider = providerRegistry.getAll().find((p) => p.isConfigured);
      if (!fallbackProvider) {
        throw new Error(`No configured video provider available for sync.`);
      }
    }

    const activeProvider = provider?.isConfigured
      ? provider
      : providerRegistry.getAll().find((p) => p.isConfigured)!;

    // Create sync job record
    const job = await prisma.contentSyncJob.create({
      data: {
        provider: activeProvider.providerType,
        categoryId: category.id,
        status: 'RUNNING',
      },
    });

    let totalDiscovered = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    try {
      // Search queries: Category main query + top subcategory queries
      const queriesToRun: Array<{ query: string; subcategoryId?: string }> = [
        { query: catDef?.searchQuery || category.name },
      ];

      // Add queries from up to 3 subcategories
      if (category.subcategories.length > 0 && catDef?.subcategories) {
        for (const sub of category.subcategories.slice(0, 3)) {
          const subDef = catDef.subcategories.find((s) => s.slug === sub.slug);
          if (subDef?.searchQueries?.[0]) {
            queriesToRun.push({ query: subDef.searchQueries[0], subcategoryId: sub.id });
          }
        }
      }

      const limitPerQuery = Math.max(3, Math.floor((options.limitPerCategory || 8) / queriesToRun.length));

      for (const qObj of queriesToRun) {
        const searchResult = await activeProvider.search({
          query: qObj.query,
          maxResults: limitPerQuery,
          categorySlug: category.slug,
        });

        totalDiscovered += searchResult.videos.length;

        for (const videoData of searchResult.videos) {
          const saveResult = await this.saveNormalizedVideo(videoData, category.id, qObj.subcategoryId);
          if (saveResult.imported) {
            totalImported++;
          } else {
            totalSkipped++;
          }
        }
      }

      await prisma.contentSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          itemsDiscovered: totalDiscovered,
          itemsImported: totalImported,
          itemsSkipped: totalSkipped,
        },
      });

      await prisma.videoProvider.updateMany({
        where: { providerType: activeProvider.providerType },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          totalDiscovered: { increment: totalDiscovered },
          totalImported: { increment: totalImported },
        },
      });

      return { discovered: totalDiscovered, imported: totalImported, skipped: totalSkipped };
    } catch (err: any) {
      await prisma.contentSyncJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorSummary: err.message,
        },
      });

      await prisma.videoProvider.updateMany({
        where: { providerType: activeProvider.providerType },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastError: err.message,
        },
      });

      throw err;
    }
  }

  /**
   * Saves or updates a video from an external provider, safely deduplicating by [provider, providerVideoId].
   * Crucial Security Enforcement:
   * External content (YouTube, NASA, Archive) has downloadAllowed = false by default to protect provider terms.
   */
  async saveNormalizedVideo(
    data: NormalizedVideoMetadata,
    categoryId: string,
    subcategoryId?: string
  ): Promise<{ imported: boolean; videoId: string }> {
    const isExternal = data.provider !== 'VYNTRA';

    const video = await prisma.video.upsert({
      where: {
        provider_providerVideoId: {
          provider: data.provider,
          providerVideoId: data.providerVideoId,
        },
      },
      update: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        embedUrl: data.embedUrl,
        originalUrl: data.originalUrl,
        durationSeconds: data.durationSeconds || undefined,
        creatorName: data.creatorName,
        creatorChannelUrl: data.creatorChannelUrl,
        rightsStatus: data.rightsStatus,
        licenseName: data.licenseName,
        attributionText: data.attributionText,
        tags: data.tags,
        metadataJson: data.metadataJson ? JSON.stringify(data.metadataJson) : undefined,
        lastCheckedAt: new Date(),
        // Keep downloadAllowed false for external content
        downloadAllowed: !isExternal,
      },
      create: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        embedUrl: data.embedUrl,
        videoUrl: data.videoUrl,
        originalUrl: data.originalUrl,
        provider: data.provider,
        providerVideoId: data.providerVideoId,
        playbackType: data.playbackType,
        durationSeconds: data.durationSeconds || 0,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        language: data.language || 'en',
        visibility: 'PUBLIC',
        downloadAllowed: !isExternal, // NEVER allow external YouTube downloads
        creatorName: data.creatorName,
        creatorChannelUrl: data.creatorChannelUrl,
        contentStatus: 'AVAILABLE',
        rightsStatus: data.rightsStatus,
        licenseName: data.licenseName,
        attributionText: data.attributionText,
        tags: data.tags,
        metadataJson: data.metadataJson ? JSON.stringify(data.metadataJson) : undefined,
        publishedAt: data.publishedAt,
        importedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });

    return { imported: true, videoId: video.id };
  }

  /**
   * Unified Search across Neon DB with smart multi-field matching and fallback to live provider query.
   */
  async search(params: {
    query: string;
    categoryId?: string;
    subcategoryId?: string;
    provider?: ContentProviderType;
    sortBy?: 'relevance' | 'newest' | 'views' | 'duration' | 'duration_asc' | 'duration_desc';
    duration?: 'short' | 'medium' | 'long' | 'all';
    dateRange?: 'today' | 'this_week' | 'this_month' | 'this_year' | 'all';
    language?: string;
    playbackType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    videos: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(params.limit || 24, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      contentStatus: 'AVAILABLE',
      visibility: 'PUBLIC',
    };

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params.subcategoryId) {
      where.subcategoryId = params.subcategoryId;
    }
    if (params.provider) {
      where.provider = params.provider;
    }
    if (params.language && params.language !== 'all') {
      where.language = params.language;
    }
    if (params.playbackType && params.playbackType !== 'all') {
      where.playbackType = params.playbackType;
    }

    // Duration filter
    if (params.duration === 'short') {
      where.durationSeconds = { gt: 0, lte: 300 }; // <= 5 minutes
    } else if (params.duration === 'medium') {
      where.durationSeconds = { gt: 300, lte: 1200 }; // 5 to 20 minutes
    } else if (params.duration === 'long') {
      where.durationSeconds = { gt: 1200 }; // > 20 minutes
    }

    // Publication Date filter
    if (params.dateRange && params.dateRange !== 'all') {
      const now = new Date();
      let sinceDate = new Date();
      if (params.dateRange === 'today') {
        sinceDate.setHours(0, 0, 0, 0);
      } else if (params.dateRange === 'this_week') {
        sinceDate.setDate(now.getDate() - 7);
      } else if (params.dateRange === 'this_month') {
        sinceDate.setMonth(now.getMonth() - 1);
      } else if (params.dateRange === 'this_year') {
        sinceDate.setFullYear(now.getFullYear() - 1);
      }
      where.publishedAt = { gte: sinceDate };
    }

    if (params.query && params.query.trim().length > 0) {
      const q = params.query.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { creatorName: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q, q.toLowerCase(), q.toUpperCase()] } },
      ];
    }

    let orderBy: any = { publishedAt: 'desc' };
    if (params.sortBy === 'views') {
      orderBy = { viewsCount: 'desc' };
    } else if (params.sortBy === 'duration' || params.sortBy === 'duration_desc') {
      orderBy = { durationSeconds: 'desc' };
    } else if (params.sortBy === 'duration_asc') {
      orderBy = { durationSeconds: 'asc' };
    } else if (params.sortBy === 'newest') {
      orderBy = { publishedAt: 'desc' };
    }

    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
    ]);

    // If query has 0 results and is specific, try live external query and ingest on-the-fly
    if (total === 0 && params.query && params.query.trim().length > 3) {
      const activeProvider = providerRegistry.getAll().find((p) => p.isConfigured);
      if (activeProvider) {
        try {
          const liveResults = await activeProvider.search({
            query: params.query,
            maxResults: 6,
          });

          // Associate with matched category if available, otherwise default to Science or Tech
          const defaultCat = await prisma.category.findFirst({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          });

          if (defaultCat && liveResults.videos.length > 0) {
            for (const v of liveResults.videos) {
              await this.saveNormalizedVideo(v, defaultCat.id);
            }
            // Re-fetch once ingested
            return this.search(params);
          }
        } catch (e: any) {
          console.warn('[DiscoveryService] Live query fallback error:', e.message);
        }
      }
    }

    return {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves all categories with their subcategories and video counts.
   */
  async getCategories(): Promise<any[]> {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { videos: { where: { contentStatus: 'AVAILABLE' } } } },
          },
        },
        _count: {
          select: { videos: { where: { contentStatus: 'AVAILABLE' } } },
        },
      },
    });
  }

  /**
   * Retrieves category by slug.
   */
  async getCategoryBySlug(slug: string): Promise<any> {
    return prisma.category.findUnique({
      where: { slug },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            _count: { select: { videos: { where: { contentStatus: 'AVAILABLE' } } } },
          },
        },
        _count: {
          select: { videos: { where: { contentStatus: 'AVAILABLE' } } },
        },
      },
    });
  }

  /**
   * Video verification to detect broken or removed third-party videos.
   */
  async verifyVideoStatus(videoId: string): Promise<boolean> {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video || !video.providerVideoId) return true;

    const provider = providerRegistry.get(video.provider as ContentProviderType);
    if (!provider) return true;

    const isAvailable = await provider.checkAvailability(video.providerVideoId);

    if (!isAvailable) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          contentStatus: 'UNAVAILABLE',
          lastCheckedAt: new Date(),
        },
      });

      await prisma.videoSourceEvent.create({
        data: {
          videoId,
          eventType: 'UNAVAILABLE_DETECTED',
          details: JSON.stringify({ reason: 'Provider reported video unavailable or non-embeddable' }),
        },
      });
      return false;
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { lastCheckedAt: new Date() },
    });
    return true;
  }

  /**
   * Discovery statistics for admin dashboard.
   */
  async getDiscoveryStats(): Promise<any> {
    const [
      totalVideos,
      availableVideos,
      unavailableVideos,
      providerBreakdown,
      categoryBreakdown,
      recentSyncJobs,
      providerStatuses,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { contentStatus: 'AVAILABLE' } }),
      prisma.video.count({ where: { contentStatus: { in: ['UNAVAILABLE', 'FLAGGED', 'HIDDEN'] } } }),
      prisma.video.groupBy({
        by: ['provider'],
        _count: { id: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { videos: true } },
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.contentSyncJob.findMany({
        take: 10,
        orderBy: { startedAt: 'desc' },
      }),
      providerRegistry.getAllStatuses(),
    ]);

    return {
      totalVideos,
      availableVideos,
      unavailableVideos,
      providerBreakdown,
      categoryBreakdown,
      recentSyncJobs,
      providerStatuses,
    };
  }

  /**
   * Fast autocomplete for search bar (titles, creator names, categories, tags)
   */
  async autocomplete(query: string, limit = 8): Promise<string[]> {
    if (!query || query.trim().length === 0) {
      return [
        'Artificial Intelligence',
        'Deep Space Exploration',
        'Ocean Wildlife & Marine Biology',
        'Human Brain & Neuroscience',
        'Quantum Computing Breakthroughs',
        'Ancient Civilizations & History',
      ];
    }

    const q = query.trim();

    // Find matching video titles, categories, and creator names
    const [matchingVideos, matchingCategories] = await Promise.all([
      prisma.video.findMany({
        where: {
          contentStatus: 'AVAILABLE',
          visibility: 'PUBLIC',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { creatorName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { title: true, creatorName: true },
        take: limit,
      }),
      prisma.category.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
          isActive: true,
        },
        select: { name: true },
        take: 3,
      }),
    ]);

    const suggestions = new Set<string>();

    matchingCategories.forEach((c) => suggestions.add(c.name));
    matchingVideos.forEach((v) => {
      suggestions.add(v.title);
      if (v.creatorName && v.creatorName.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(v.creatorName);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get user's recent search queries
   */
  async getRecentSearches(userId: string, limit = 10) {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Save a recent search query for authenticated user
   */
  async saveRecentSearch(userId: string, query: string) {
    if (!query || query.trim().length === 0) return null;
    const cleanQuery = query.trim();

    // Prevent duplicate adjacent entries
    const existing = await prisma.searchHistory.findFirst({
      where: { userId, query: cleanQuery },
    });

    if (existing) {
      return prisma.searchHistory.update({
        where: { id: existing.id },
        data: { createdAt: new Date() },
      });
    }

    return prisma.searchHistory.create({
      data: { userId, query: cleanQuery },
    });
  }

  /**
   * Delete single recent search query
   */
  async deleteRecentSearch(userId: string, id: string) {
    return prisma.searchHistory.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Clear all recent search queries for user
   */
  async clearRecentSearches(userId: string) {
    return prisma.searchHistory.deleteMany({
      where: { userId },
    });
  }
}

export const discoveryService = new DiscoveryService();

