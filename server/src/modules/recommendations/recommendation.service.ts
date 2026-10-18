import prisma from '../../database/client.js';
import { ContentProvider, FeedbackType } from '@prisma/client';

export class RecommendationService {
  /**
   * Get personalized recommendations for a user.
   * If userId is provided, incorporates:
   * 1. Category preferences
   * 2. Watched categories & videos
   * 3. Liked & saved videos
   * 4. Excludes "NOT_INTERESTED", "HIDE_SOURCE", hidden, and deleted videos
   * 5. Freshness & diversity balance
   * If guest/no history: provides popular, high-rated, curated videos across diverse categories.
   */
  static async getPersonalizedRecommendations(userId?: string, limit = 12) {
    let excludedVideoIds: string[] = [];
    let excludedProviders: ContentProvider[] = [];
    let excludedCategoryIds: string[] = [];
    let preferredCategoryIds: string[] = [];

    if (userId) {
      // 1. Fetch user feedback (Not interested, hide source, etc.)
      const feedbacks = await prisma.recommendationFeedback.findMany({
        where: { userId },
      });

      for (const fb of feedbacks) {
        if (fb.feedbackType === FeedbackType.NOT_INTERESTED || fb.feedbackType === FeedbackType.REMOVE) {
          if (fb.videoId) excludedVideoIds.push(fb.videoId);
        } else if (fb.feedbackType === FeedbackType.HIDE_SOURCE && fb.provider) {
          excludedProviders.push(fb.provider);
        } else if (fb.feedbackType === FeedbackType.SHOW_FEWER && fb.categoryId) {
          excludedCategoryIds.push(fb.categoryId);
        }
      }

      // 2. Fetch user explicit category preferences
      const categoryPrefs = await prisma.userCategoryPreference.findMany({
        where: { userId },
        select: { categoryId: true },
      });
      preferredCategoryIds = categoryPrefs.map((p) => p.categoryId);

      // 3. Fetch recently watched, liked, and saved video category signals
      const [watchHistory, likes, saved] = await Promise.all([
        prisma.watchHistory.findMany({
          where: { userId },
          orderBy: { lastWatchedAt: 'desc' },
          take: 20,
          include: { video: { select: { id: true, categoryId: true } } },
        }),
        prisma.like.findMany({
          where: { userId },
          take: 20,
          include: { video: { select: { id: true, categoryId: true } } },
        }),
        prisma.savedVideo.findMany({
          where: { userId },
          take: 20,
          include: { video: { select: { id: true, categoryId: true } } },
        }),
      ]);

      // Add already watched video IDs to deprioritize/exclude repeating videos
      const watchedVideoIds = watchHistory.map((w) => w.video.id);
      excludedVideoIds = Array.from(new Set([...excludedVideoIds, ...watchedVideoIds]));

      // Count engagement frequencies per category
      const categoryWeights: Record<string, number> = {};
      preferredCategoryIds.forEach((cId) => {
        categoryWeights[cId] = (categoryWeights[cId] || 0) + 10;
      });
      watchHistory.forEach((w) => {
        if (w.video?.categoryId) {
          categoryWeights[w.video.categoryId] = (categoryWeights[w.video.categoryId] || 0) + 2;
        }
      });
      likes.forEach((l) => {
        if (l.video?.categoryId) {
          categoryWeights[l.video.categoryId] = (categoryWeights[l.video.categoryId] || 0) + 4;
        }
      });
      saved.forEach((s) => {
        if (s.video?.categoryId) {
          categoryWeights[s.video.categoryId] = (categoryWeights[s.video.categoryId] || 0) + 5;
        }
      });

      // Deduct for show-fewer categories
      excludedCategoryIds.forEach((cId) => {
        categoryWeights[cId] = -10;
      });

      // Sort categories by engagement score
      const sortedTopCategoryIds = Object.entries(categoryWeights)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      // Fetch recommended videos matching top interests
      const whereClause: any = {
        visibility: 'PUBLIC',
        contentStatus: 'AVAILABLE',
      };
      if (excludedVideoIds.length > 0) {
        whereClause.id = { notIn: excludedVideoIds };
      }
      if (excludedProviders.length > 0) {
        whereClause.provider = { notIn: excludedProviders };
      }

      let recommended: any[] = [];

      // Query 1: Top interested categories
      if (sortedTopCategoryIds.length > 0) {
        recommended = await prisma.video.findMany({
          where: {
            ...whereClause,
            categoryId: { in: sortedTopCategoryIds },
          },
          include: {
            category: true,
            subcategory: true,
            creator: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
          take: limit,
        });
      }

      // Query 2: If we need more videos or have fewer in top categories, fill with diverse popular videos
      if (recommended.length < limit) {
        const remainingLimit = limit - recommended.length;
        const currentIds = [...excludedVideoIds, ...recommended.map((v) => v.id)];
        const filler = await prisma.video.findMany({
          where: {
            ...whereClause,
            id: { notIn: currentIds },
          },
          include: {
            category: true,
            subcategory: true,
            creator: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
          take: remainingLimit,
        });
        recommended = [...recommended, ...filler];
      }

      return recommended.map((v) => ({
        ...v,
        fileSizeBytes: v.fileSizeBytes.toString(),
      }));
    }

    // Guest / New User Recommendations: Diverse popular videos across categories
    const videos = await prisma.video.findMany({
      where: {
        visibility: 'PUBLIC',
        contentStatus: 'AVAILABLE',
      },
      include: {
        category: true,
        subcategory: true,
        creator: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    });

    return videos.map((v) => ({
      ...v,
      fileSizeBytes: v.fileSizeBytes.toString(),
    }));
  }

  /**
   * "Because You Watched..." recommendation section
   * Finds the user's most recently watched completed or engaged video,
   * then finds similar videos in the same category/tags.
   */
  static async getBecauseYouWatched(userId: string, limit = 6) {
    // Find the latest watched video with valid progress
    const latestWatch = await prisma.watchHistory.findFirst({
      where: { userId },
      orderBy: { lastWatchedAt: 'desc' },
      include: {
        video: {
          include: { category: true },
        },
      },
    });

    if (!latestWatch || !latestWatch.video) {
      return null;
    }

    const sourceVideo = latestWatch.video;

    // Find similar videos in the same category or sharing tags
    const similarVideos = await prisma.video.findMany({
      where: {
        id: { not: sourceVideo.id },
        visibility: 'PUBLIC',
        contentStatus: 'AVAILABLE',
        categoryId: sourceVideo.categoryId,
      },
      include: {
        category: true,
        subcategory: true,
        creator: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: [{ viewsCount: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    });

    return {
      sourceVideo: {
        id: sourceVideo.id,
        title: sourceVideo.title,
        thumbnailUrl: sourceVideo.thumbnailUrl,
        category: sourceVideo.category,
      },
      videos: similarVideos.map((v) => ({
        ...v,
        fileSizeBytes: v.fileSizeBytes.toString(),
      })),
    };
  }

  /**
   * Record recommendation feedback ("NOT_INTERESTED", "SHOW_FEWER", "HIDE_SOURCE", "REMOVE")
   */
  static async recordFeedback(
    userId: string,
    data: {
      videoId?: string;
      categoryId?: string;
      provider?: ContentProvider;
      feedbackType: FeedbackType;
      reason?: string;
    }
  ) {
    return prisma.recommendationFeedback.create({
      data: {
        userId,
        videoId: data.videoId,
        categoryId: data.categoryId,
        provider: data.provider,
        feedbackType: data.feedbackType,
        reason: data.reason,
      },
    });
  }

  /**
   * Remove/Undo feedback item
   */
  static async undoFeedback(userId: string, feedbackId: string) {
    const feedback = await prisma.recommendationFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!feedback || feedback.userId !== userId) {
      throw new Error('Feedback not found or unauthorized');
    }
    return prisma.recommendationFeedback.delete({ where: { id: feedbackId } });
  }

  /**
   * Reset user recommendations and preferences
   */
  static async resetRecommendations(userId: string) {
    await prisma.$transaction([
      prisma.recommendationFeedback.deleteMany({ where: { userId } }),
      prisma.userCategoryPreference.deleteMany({ where: { userId } }),
    ]);
    return { success: true, message: 'Recommendation preferences reset successfully' };
  }

  /**
   * Set user preferred categories (for onboarding / settings)
   */
  static async setCategoryPreferences(userId: string, categoryIds: string[]) {
    await prisma.userCategoryPreference.deleteMany({ where: { userId } });
    if (categoryIds.length > 0) {
      await prisma.userCategoryPreference.createMany({
        data: categoryIds.map((categoryId) => ({
          userId,
          categoryId,
        })),
        skipDuplicates: true,
      });
    }
    return prisma.userCategoryPreference.findMany({
      where: { userId },
      include: { category: true },
    });
  }

  /**
   * Get user preferred categories
   */
  static async getCategoryPreferences(userId: string) {
    return prisma.userCategoryPreference.findMany({
      where: { userId },
      include: { category: true },
    });
  }
}
