import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

const reportSchema = z.object({
  targetType: z.enum(['VIDEO', 'COMMENT', 'USER']),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(100),
  details: z.string().max(1000).optional(),
});

// Like / Unlike Video
export const toggleLike = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (existing) {
      await prisma.like.delete({
        where: { id: existing.id },
      });
      res.json({ success: true, liked: false });
    } else {
      await prisma.like.create({
        data: { userId, videoId },
      });

      // Notify video creator if not own video
      const video = await prisma.video.findUnique({ where: { id: videoId } });
      if (video && video.creatorId && video.creatorId !== userId) {
        await prisma.notification.create({
          data: {
            userId: video.creatorId,
            type: 'LIKE',
            title: 'New Like',
            message: `${req.user!.username} liked your video "${video.title}"`,
            link: `/watch/${videoId}`,
          },
        });
      }

      res.json({ success: true, liked: true });
    }
  } catch (error) {
    next(error);
  }
};

// Save / Unsave Video
export const toggleSave = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.savedVideo.findUnique({
      where: { userId_videoId: { userId, videoId } },
    });

    if (existing) {
      await prisma.savedVideo.delete({ where: { id: existing.id } });
      res.json({ success: true, saved: false });
    } else {
      await prisma.savedVideo.create({
        data: { userId, videoId },
      });
      res.json({ success: true, saved: true });
    }
  } catch (error) {
    next(error);
  }
};

// Follow / Unfollow Creator
export const toggleFollow = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: targetCreatorId } = req.params;
    const userId = req.user!.id;

    if (userId === targetCreatorId) {
      res.status(400).json({ success: false, error: 'You cannot follow yourself' });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetCreatorId,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      res.json({ success: true, following: false });
    } else {
      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetCreatorId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: targetCreatorId,
          type: 'FOLLOW',
          title: 'New Follower',
          message: `${req.user!.username} started following you`,
          link: `/creator/${userId}`,
        },
      });

      res.json({ success: true, following: true });
    }
  } catch (error) {
    next(error);
  }
};

// Get Video Comments with nested replies
export const getComments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: videoId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        videoId,
        parentId: null, // Top-level comments
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, username: true, avatarUrl: true, role: true },
            },
            _count: {
              select: { commentLikes: true },
            },
          },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
    });

    res.json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// Add Comment or Reply
export const addComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;
    const data = commentSchema.parse(req.body);

    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        videoId,
        userId,
        parentId: data.parentId || null,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        _count: {
          select: { commentLikes: true, replies: true },
        },
      },
    });

    // Notify video creator or parent comment owner
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: data.parentId } });
      if (parentComment && parentComment.userId !== userId) {
        await prisma.notification.create({
          data: {
            userId: parentComment.userId,
            type: 'REPLY',
            title: 'New Reply',
            message: `${req.user!.username} replied to your comment: "${data.content.slice(0, 50)}..."`,
            link: `/watch/${videoId}`,
          },
        });
      }
    } else if (video && video.creatorId && video.creatorId !== userId) {
      await prisma.notification.create({
        data: {
          userId: video.creatorId,
          type: 'COMMENT',
          title: 'New Comment',
          message: `${req.user!.username} commented on "${video.title}"`,
          link: `/watch/${videoId}`,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// Edit Comment
export const editComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, error: 'Comment not found' });
      return;
    }

    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Permission denied' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: {
        content,
        isEdited: true,
        // Clear old translation on edit
        translatedContent: null,
        translationLang: null,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Comment
export const deleteComment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, error: 'Comment not found' });
      return;
    }

    if (comment.userId !== userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Permission denied' });
      return;
    }

    await prisma.comment.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Record Watch Progress
export const recordWatchProgress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user!.id;
    const { progressSeconds, completed } = z.object({
      progressSeconds: z.number().int().min(0),
      completed: z.boolean().optional().default(false),
    }).parse(req.body);

    const history = await prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: {
        progressSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
      create: {
        userId,
        videoId,
        progressSeconds,
        completed,
        lastWatchedAt: new Date(),
      },
    });

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// Submit Report
export const submitReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = reportSchema.parse(req.body);

    const report = await prisma.userReport.create({
      data: {
        reporterId: userId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        details: data.details,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our moderation team will review it.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};
