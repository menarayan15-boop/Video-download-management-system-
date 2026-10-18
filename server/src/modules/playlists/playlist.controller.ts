import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

const createPlaylistSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  isPrivate: z.boolean().optional().default(true),
});

const updatePlaylistSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  isPrivate: z.boolean().optional(),
});

const addPlaylistItemSchema = z.object({
  videoId: z.string().uuid(),
});

const reorderSchema = z.object({
  videoIds: z.array(z.string().uuid()),
});

/**
 * Get user's playlists with preview thumbnail and item count
 */
export const getMyPlaylists = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { items: true } },
        items: {
          take: 1,
          orderBy: { order: 'asc' },
          include: {
            video: {
              select: { thumbnailUrl: true, title: true },
            },
          },
        },
      },
    });

    const formatted = playlists.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      isPrivate: p.isPrivate,
      shareToken: p.shareToken,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      videoCount: p._count.items,
      thumbnailUrl: p.items[0]?.video?.thumbnailUrl || null,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new playlist
 */
export const createPlaylist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = createPlaylistSchema.parse(req.body);

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        isPrivate: data.isPrivate,
        shareToken: randomBytes(16).toString('hex'),
      },
    });

    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single playlist by ID (accessible by owner, or public/shared)
 */
export const getPlaylistById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const shareToken = req.query.token as string | undefined;
    const currentUserId = req.user?.id;

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        items: {
          orderBy: { order: 'asc' },
          include: {
            video: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                creator: { select: { id: true, username: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }

    const isOwner = currentUserId && playlist.userId === currentUserId;
    const isPublic = !playlist.isPrivate;
    const hasValidShareToken = shareToken && playlist.shareToken === shareToken;

    if (!isOwner && !isPublic && !hasValidShareToken) {
      res.status(403).json({ success: false, error: 'This playlist is private.' });
      return;
    }

    // Filter out any deleted/broken videos gracefully
    const validItems = playlist.items
      .filter((item) => item.video && item.video.contentStatus !== 'UNAVAILABLE')
      .map((item) => ({
        id: item.id,
        order: item.order,
        addedAt: item.addedAt,
        video: {
          ...item.video,
          fileSizeBytes: item.video.fileSizeBytes.toString(),
        },
      }));

    res.json({
      success: true,
      data: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        isPrivate: playlist.isPrivate,
        shareToken: playlist.shareToken,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        user: playlist.user,
        isOwner,
        items: validItems,
        videoCount: validItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update playlist details
 */
export const updatePlaylist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data = updatePlaylistSchema.parse(req.body);

    const existing = await prisma.playlist.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }
    if (existing.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Unauthorized to edit this playlist' });
      return;
    }

    const updated = await prisma.playlist.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isPrivate: data.isPrivate,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete playlist
 */
export const deletePlaylist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.playlist.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }
    if (existing.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Unauthorized to delete this playlist' });
      return;
    }

    await prisma.playlist.delete({ where: { id } });
    res.json({ success: true, message: 'Playlist deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Add video to playlist
 */
export const addPlaylistItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { videoId } = addPlaylistItemSchema.parse(req.body);

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }
    if (playlist.userId !== userId) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Check if video already exists in playlist
    const existing = await prisma.playlistItem.findUnique({
      where: { playlistId_videoId: { playlistId: id, videoId } },
    });
    if (existing) {
      res.status(409).json({ success: false, error: 'Video is already in this playlist' });
      return;
    }

    // Get max order
    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (lastItem?.order ?? -1) + 1;

    const item = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        videoId,
        order: nextOrder,
      },
    });

    // Touch playlist updatedAt
    await prisma.playlist.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove video from playlist
 */
export const removePlaylistItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, videoId } = req.params;
    const userId = req.user!.id;

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }
    if (playlist.userId !== userId) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await prisma.playlistItem.deleteMany({
      where: { playlistId: id, videoId },
    });

    // Touch playlist updatedAt
    await prisma.playlist.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.json({ success: true, message: 'Video removed from playlist' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder videos in playlist
 */
export const reorderPlaylistItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { videoIds } = reorderSchema.parse(req.body);

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist) {
      res.status(404).json({ success: false, error: 'Playlist not found' });
      return;
    }
    if (playlist.userId !== userId) {
      res.status(403).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Update order for each video in transaction
    await prisma.$transaction(
      videoIds.map((vId, idx) =>
        prisma.playlistItem.updateMany({
          where: { playlistId: id, videoId: vId },
          data: { order: idx },
        })
      )
    );

    res.json({ success: true, message: 'Playlist reordered successfully' });
  } catch (error) {
    next(error);
  }
};
