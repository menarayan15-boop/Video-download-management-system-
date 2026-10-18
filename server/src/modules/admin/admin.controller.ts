import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

export const getAdminStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCreators,
      totalVideos,
      totalDownloads,
      activeSubscriptions,
      pendingReports,
      recentOperations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CREATOR' } }),
      prisma.video.count(),
      prisma.downloadOperation.count({ where: { status: 'COMPLETED' } }),
      prisma.userSubscription.count({ where: { status: 'ACTIVE' } }),
      prisma.userReport.count({ where: { status: 'PENDING' } }),
      prisma.downloadOperation.findMany({
        take: 5,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: { select: { username: true } },
          video: { select: { title: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCreators,
        totalVideos,
        totalDownloads,
        activeSubscriptions,
        pendingReports,
        recentOperations: recentOperations.map((op) => ({
          ...op,
          fileSizeBytes: op.fileSizeBytes ? op.fileSizeBytes.toString() : null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
          },
          _count: {
            select: { videos: true, downloadOperations: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          ...u,
          activePlan: u.subscriptions[0]?.plan.displayName || 'None',
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = z.object({ role: z.enum(['USER', 'CREATOR', 'ADMIN']) }).parse(req.body);

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, username: true, email: true, role: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.user!.id === id) {
      res.status(400).json({ success: false, error: 'Cannot delete yourself' });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getAdminVideos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, username: true, avatarUrl: true } },
          category: { select: { name: true, slug: true } },
          _count: { select: { downloadOperations: true, likes: true } },
        },
      }),
      prisma.video.count(),
    ]);

    res.json({
      success: true,
      data: {
        videos: videos.map((v) => ({ ...v, fileSizeBytes: v.fileSizeBytes.toString() })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminModeration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.userReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, email: true } },
      },
    });

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']),
    }).parse(req.body);

    const updated = await prisma.userReport.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getDownloadAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const [logs, total] = await Promise.all([
      prisma.downloadOperation.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { requestedAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          video: { select: { id: true, title: true } },
          subscription: { include: { plan: true } },
          history: { orderBy: { eventTimestamp: 'desc' }, take: 3 },
        },
      }),
      prisma.downloadOperation.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map((l) => ({
          ...l,
          fileSizeBytes: l.fileSizeBytes ? l.fileSizeBytes.toString() : null,
        })),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlanConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { price, downloadLimit, isActive, deviceLimit } = z.object({
      price: z.number().min(0).optional(),
      downloadLimit: z.number().int().min(1).optional(),
      deviceLimit: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        price,
        downloadLimit,
        deviceLimit,
        isActive,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
