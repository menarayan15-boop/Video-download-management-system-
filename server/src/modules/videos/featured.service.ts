import prisma from '../../database/client.js';

export interface FeaturedAdminConfig {
  dynamicEnabled: boolean;
  pinnedVideoId: string | null;
  pinExpiresAt: string | null;
  categoryDiversity: boolean;
  preferredCategories: string[];
}

export class FeaturedVideoService {
  private config: FeaturedAdminConfig = {
    dynamicEnabled: true,
    pinnedVideoId: null,
    pinExpiresAt: null,
    categoryDiversity: true,
    preferredCategories: [
      'space-astronomy',
      'technology-ai',
      'nature-wildlife',
      'human-body-health',
      'general-science',
      'history-archaeology',
      'engineering-inventions',
    ],
  };

  // Ring buffer of recently served featured IDs to prevent repetitive selection on refresh
  private recentFeaturedIds: string[] = [];
  private readonly maxRecentHistory = 10;

  getConfig(): FeaturedAdminConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<FeaturedAdminConfig>): FeaturedAdminConfig {
    this.config = {
      ...this.config,
      ...updates,
    };
    return this.getConfig();
  }

  /**
   * Selects a single dynamic featured video, avoiding recently served IDs and the excludeId.
   */
  async getSingleFeaturedVideo(excludeId?: string): Promise<any | null> {
    // 1. Check if pinned video is active
    if (this.config.pinnedVideoId) {
      const isExpired = this.config.pinExpiresAt && new Date(this.config.pinExpiresAt) < new Date();
      if (!isExpired) {
        const pinned = await prisma.video.findUnique({
          where: { id: this.config.pinnedVideoId },
          include: {
            category: { select: { id: true, name: true, slug: true, icon: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            creator: { select: { id: true, username: true, avatarUrl: true, role: true } },
            _count: { select: { likes: true, comments: true } },
          },
        });
        if (pinned && pinned.contentStatus === 'AVAILABLE' && pinned.visibility === 'PUBLIC') {
          return pinned;
        }
      }
    }

    // 2. Query candidates for rotation
    const candidates = await this.getFeaturedCandidates(12);
    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // 3. Filter out excludeId and recent history
    let eligible = candidates.filter((c) => c.id !== excludeId);
    if (eligible.length === 0) eligible = candidates;

    // Filter out very recently shown items if we have enough options
    const notRecentlyShown = eligible.filter((c) => !this.recentFeaturedIds.includes(c.id));
    const pool = notRecentlyShown.length > 0 ? notRecentlyShown : eligible;

    // Randomly pick one from the diverse pool
    const selected = pool[Math.floor(Math.random() * pool.length)];

    // Update recent history
    this.recordFeaturedServed(selected.id);

    return selected;
  }

  /**
   * Retrieves a diverse list of featured videos (e.g. 5-8 items across categories) for the hero carousel.
   */
  async getFeaturedCandidates(limit = 6): Promise<any[]> {
    const baseWhere = {
      contentStatus: 'AVAILABLE' as const,
      visibility: 'PUBLIC' as const,
      thumbnailUrl: { not: '' },
    };

    // Grab categories to ensure category diversity
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { displayOrder: 'asc' },
    });

    const categorySlugs = this.config.preferredCategories.length > 0
      ? this.config.preferredCategories
      : categories.map((c) => c.slug);

    const diverseVideos: any[] = [];
    const usedVideoIds = new Set<string>();

    // Check pinned video
    if (this.config.pinnedVideoId) {
      const isExpired = this.config.pinExpiresAt && new Date(this.config.pinExpiresAt) < new Date();
      if (!isExpired) {
        const pinned = await prisma.video.findUnique({
          where: { id: this.config.pinnedVideoId },
          include: {
            category: { select: { id: true, name: true, slug: true, icon: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            creator: { select: { id: true, username: true, avatarUrl: true, role: true } },
            _count: { select: { likes: true, comments: true } },
          },
        });
        if (pinned && pinned.contentStatus === 'AVAILABLE') {
          diverseVideos.push(pinned);
          usedVideoIds.add(pinned.id);
        }
      }
    }

    // Fetch up to 1 top video from each distinct preferred category to guarantee multi-topic diversity
    for (const catSlug of categorySlugs) {
      if (diverseVideos.length >= limit) break;

      const catObj = categories.find((c) => c.slug === catSlug);
      if (!catObj) continue;

      const video = await prisma.video.findFirst({
        where: {
          ...baseWhere,
          categoryId: catObj.id,
          id: { notIn: Array.from(usedVideoIds) },
        },
        orderBy: [
          { viewsCount: 'desc' },
          { publishedAt: 'desc' },
        ],
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, username: true, avatarUrl: true, role: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });

      if (video) {
        diverseVideos.push(video);
        usedVideoIds.add(video.id);
      }
    }

    // If still under limit, backfill with top available videos
    if (diverseVideos.length < limit) {
      const additional = await prisma.video.findMany({
        where: {
          ...baseWhere,
          id: { notIn: Array.from(usedVideoIds) },
        },
        take: limit - diverseVideos.length,
        orderBy: { viewsCount: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          subcategory: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, username: true, avatarUrl: true, role: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });

      diverseVideos.push(...additional);
    }

    return diverseVideos;
  }

  /**
   * Tracks recently selected featured videos in a circular buffer.
   */
  private recordFeaturedServed(id: string): void {
    this.recentFeaturedIds.push(id);
    if (this.recentFeaturedIds.length > this.maxRecentHistory) {
      this.recentFeaturedIds.shift();
    }
  }

  /**
   * Diagnostic statistics for the admin dashboard.
   */
  async getFeaturedDiagnostics(): Promise<{
    config: FeaturedAdminConfig;
    eligibleCount: number;
    recentServedCount: number;
    recentServedIds: string[];
    topDiversePreview: Array<{ id: string; title: string; category: string; provider: string }>;
  }> {
    const eligibleCount = await prisma.video.count({
      where: {
        contentStatus: 'AVAILABLE',
        visibility: 'PUBLIC',
      },
    });

    const candidates = await this.getFeaturedCandidates(5);

    return {
      config: this.getConfig(),
      eligibleCount,
      recentServedCount: this.recentFeaturedIds.length,
      recentServedIds: [...this.recentFeaturedIds],
      topDiversePreview: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category?.name || 'Uncategorized',
        provider: c.provider,
      })),
    };
  }
}

export const featuredVideoService = new FeaturedVideoService();
