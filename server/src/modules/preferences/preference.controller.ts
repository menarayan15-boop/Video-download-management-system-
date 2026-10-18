import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../database/client.js';
import { AuthRequest } from '../../middleware/auth.js';

const preferenceSchema = z.object({
  preferredLanguage: z.string().min(2).max(10).optional(),
  captionsEnabled: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  autoplay: z.boolean().optional(),
  soundOn: z.boolean().optional(),
  theme: z.enum(['dark', 'high-contrast']).optional(),
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
});

/**
 * Get user preferences or return sensible defaults
 */
export const getUserPreferences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    const defaults = {
      preferredLanguage: 'en',
      captionsEnabled: false,
      reducedMotion: false,
      fontSize: 'medium',
      autoplay: true,
      soundOn: true,
      theme: 'dark',
      emailNotifications: true,
      inAppNotifications: true,
    };

    res.json({
      success: true,
      data: pref || { ...defaults, userId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upsert user preferences
 */
export const updateUserPreferences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = preferenceSchema.parse(req.body);

    const updated = await prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
