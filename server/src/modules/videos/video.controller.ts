import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

const listVideosSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(['newest', 'most_viewed', 'popular']).optional().default('newest'),
  creatorId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('12'),
});

const createVideoSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(5000).optional(),
  thumbnailUrl: z.string().url(),
  videoUrl: z.string().url(),
  storageKey: z.string().min(1),
  durationSeconds: z.number().int().min(1),
  fileSizeBytes: z.number().int().positive().optional().default(10000000),
  categoryId: z.string().min(1),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional().default('PUBLIC'),
  downloadAllowed: z.boolean().optional().default(true),
});

export const getVideos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, category, sort, creatorId, page, limit } = listVideosSchema.parse(req.query);

    const where: any = {
      visibility: 'PUBLIC',
    };

    if (creatorId) {
      where.creatorId = creatorId;
      // If user is creator viewing own videos, let them see non-public too
      if (req.user && req.user.id === creatorId) {
        delete where.visibility;
      }
    }

    if (category) {
      where.category = {
        slug: category,
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { creator: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (sort === 'most_viewed' || sort === 'popular') {
      orderBy.viewsCount = 'desc';
    } else {
      orderBy.publishedAt = 'desc';
    }

    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: {
            select: { id: true, username: true, avatarUrl: true, role: true },
          },
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    // Format BigInt for JSON serialization
    const safeVideos = videos.map((v) => ({
      ...v,
      fileSizeBytes: v.fileSizeBytes.toString(),
    }));

    res.json({
      success: true,
      data: {
        videos: safeVideos,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            biography: true,
            role: true,
            _count: {
              select: { followers: true, videos: true },
            },
          },
        },
        category: true,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    if (!video) {
      res.status(404).json({
        success: false,
        error: 'Video not found',
        code: 'VIDEO_NOT_FOUND',
      });
      return;
    }

    // Increment view count asynchronously
    prisma.video.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    }).catch(() => {});

    // Check interaction states if authenticated
    let isLiked = false;
    let isSaved = false;
    let isFollowingCreator = false;
    let watchProgress = null;

    if (req.user) {
      const [like, save, follow, history] = await Promise.all([
        prisma.like.findUnique({ where: { userId_videoId: { userId: req.user.id, videoId: id } } }),
        prisma.savedVideo.findUnique({ where: { userId_videoId: { userId: req.user.id, videoId: id } } }),
        video.creatorId
          ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: req.user.id, followingId: video.creatorId } } })
          : Promise.resolve(null),
        prisma.watchHistory.findUnique({ where: { userId_videoId: { userId: req.user.id, videoId: id } } }),
      ]);

      isLiked = !!like;
      isSaved = !!save;
      isFollowingCreator = !!follow;
      watchProgress = history ? { progressSeconds: history.progressSeconds, completed: history.completed } : null;
    }

    // Fetch related videos in same category (lean field projection)
    const relatedVideos = await prisma.video.findMany({
      where: {
        categoryId: video.categoryId,
        id: { not: video.id },
        visibility: 'PUBLIC',
      },
      take: 6,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        durationSeconds: true,
        viewsCount: true,
        provider: true,
        providerVideoId: true,
        fileSizeBytes: true,
        publishedAt: true,
        creatorName: true,
        creator: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { viewsCount: 'desc' },
    });

    res.json({
      success: true,
      data: {
        video: {
          ...video,
          fileSizeBytes: video.fileSizeBytes.toString(),
        },
        userState: {
          isLiked,
          isSaved,
          isFollowingCreator,
          watchProgress,
        },
        relatedVideos: relatedVideos.map((r) => ({
          ...r,
          fileSizeBytes: r.fileSizeBytes.toString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createVideo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const data = createVideoSchema.parse(req.body);

    const video = await prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        videoUrl: data.videoUrl,
        storageKey: data.storageKey,
        durationSeconds: data.durationSeconds,
        fileSizeBytes: BigInt(data.fileSizeBytes),
        categoryId: data.categoryId,
        visibility: data.visibility as any,
        downloadAllowed: data.downloadAllowed,
        creatorId: req.user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...video,
        fileSizeBytes: video.fileSizeBytes.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateVideo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found' });
      return;
    }

    if (video.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Permission denied' });
      return;
    }

    const updated = await prisma.video.update({
      where: { id },
      data: req.body,
    });

    res.json({
      success: true,
      data: {
        ...updated,
        fileSizeBytes: updated.fileSizeBytes.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      res.status(404).json({ success: false, error: 'Video not found' });
      return;
    }

    if (video.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Permission denied' });
      return;
    }

    await prisma.video.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { videos: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
