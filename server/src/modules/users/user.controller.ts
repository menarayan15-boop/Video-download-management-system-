import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  biography: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
});

export const getMyProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        biography: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            videos: true,
            savedVideos: true,
            downloadOperations: true,
          },
        },
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = updateProfileSchema.parse(req.body);

    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: data.username.toLowerCase(),
          id: { not: userId },
        },
      });
      if (existing) {
        res.status(409).json({ success: false, error: 'Username is already taken' });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username ? data.username.toLowerCase() : undefined,
        biography: data.biography,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        biography: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getSavedVideos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const saved = await prisma.savedVideo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        video: {
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true },
            },
            category: true,
          },
        },
      },
    });

    const videos = saved.map((s) => ({
      ...s.video,
      fileSizeBytes: s.video.fileSizeBytes.toString(),
      savedAt: s.createdAt,
    }));

    res.json({ success: true, data: videos });
  } catch (error) {
    next(error);
  }
};

export const getWatchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const history = await prisma.watchHistory.findMany({
      where: { userId },
      orderBy: { lastWatchedAt: 'desc' },
      include: {
        video: {
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true },
            },
            category: true,
          },
        },
      },
    });

    const formatted = history.map((h) => ({
      ...h.video,
      fileSizeBytes: h.video.fileSizeBytes.toString(),
      progressSeconds: h.progressSeconds,
      completed: h.completed,
      lastWatchedAt: h.lastWatchedAt,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

export const getCreatorProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const creator = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        biography: true,
        role: true,
        createdAt: true,
        _count: {
          select: { followers: true, videos: true },
        },
      },
    });

    if (!creator) {
      res.status(404).json({ success: false, error: 'Creator not found' });
      return;
    }

    const videos = await prisma.video.findMany({
      where: { creatorId: id, visibility: 'PUBLIC' },
      orderBy: { publishedAt: 'desc' },
      include: {
        category: true,
        _count: { select: { likes: true, comments: true } },
      },
    });

    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: id } },
      });
      isFollowing = !!follow;
    }

    res.json({
      success: true,
      data: {
        creator,
        isFollowing,
        videos: videos.map((v) => ({
          ...v,
          fileSizeBytes: v.fileSizeBytes.toString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRegisteredDevices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const devices = await prisma.registeredDevice.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });

    res.json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
};

export const registerDevice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { deviceName, deviceIdentifier } = z.object({
      deviceName: z.string().min(1),
      deviceIdentifier: z.string().min(1),
    }).parse(req.body);

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';

    const device = await prisma.registeredDevice.upsert({
      where: { userId_deviceIdentifier: { userId, deviceIdentifier } },
      update: {
        deviceName,
        ipAddress: clientIp,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        deviceName,
        deviceIdentifier,
        ipAddress: clientIp,
        lastActiveAt: new Date(),
      },
    });

    res.json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
};

export const revokeDevice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.registeredDevice.deleteMany({
      where: { id, userId },
    });

    res.json({ success: true, message: 'Device revoked successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's unfinished videos for "Continue Watching"
 */
export const getContinueWatching = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const records = await prisma.watchHistory.findMany({
      where: {
        userId,
        completed: false,
        progressSeconds: { gt: 5 }, // more than 5 seconds watched
        video: {
          contentStatus: 'AVAILABLE',
          visibility: 'PUBLIC',
        },
      },
      orderBy: { lastWatchedAt: 'desc' },
      take: 12,
      include: {
        video: {
          include: {
            creator: {
              select: { id: true, username: true, avatarUrl: true },
            },
            category: true,
            subcategory: true,
          },
        },
      },
    });

    const formatted = records.map((r) => ({
      ...r.video,
      fileSizeBytes: r.video.fileSizeBytes.toString(),
      progressSeconds: r.progressSeconds,
      completed: r.completed,
      lastWatchedAt: r.lastWatchedAt,
      progressPercentage: r.video.durationSeconds > 0
        ? Math.min(100, Math.round((r.progressSeconds / r.video.durationSeconds) * 100))
        : 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a single video from continue watching
 */
export const removeContinueWatchingVideo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { videoId } = req.params;

    await prisma.watchHistory.deleteMany({
      where: { userId, videoId },
    });

    res.json({ success: true, message: 'Removed from continue watching' });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all continue watching videos
 */
export const clearContinueWatching = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.watchHistory.deleteMany({
      where: { userId, completed: false },
    });

    res.json({ success: true, message: 'Continue watching cleared' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single item from watch history
 */
export const deleteWatchHistoryItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { videoId } = req.params;

    await prisma.watchHistory.deleteMany({
      where: { userId, videoId },
    });

    res.json({ success: true, message: 'History item removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all watch history
 */
export const clearWatchHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.watchHistory.deleteMany({
      where: { userId },
    });

    res.json({ success: true, message: 'Watch history cleared successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear all saved videos
 */
export const clearSavedVideos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.savedVideo.deleteMany({
      where: { userId },
    });

    res.json({ success: true, message: 'Saved videos cleared successfully' });
  } catch (error) {
    next(error);
  }
};

