import { Response, NextFunction } from 'express';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.notification.deleteMany({
      where: { id, userId },
    });

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await prisma.notification.deleteMany({
      where: { userId },
    });

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
};

