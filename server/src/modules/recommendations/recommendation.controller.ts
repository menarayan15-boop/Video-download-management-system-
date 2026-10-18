import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { RecommendationService } from './recommendation.service.js';
import { AuthRequest } from '../../middleware/auth.js';
import { ContentProvider, FeedbackType } from '@prisma/client';

const feedbackSchema = z.object({
  videoId: z.string().optional(),
  categoryId: z.string().optional(),
  provider: z.nativeEnum(ContentProvider).optional(),
  feedbackType: z.nativeEnum(FeedbackType),
  reason: z.string().max(300).optional(),
});

const categoryPrefsSchema = z.object({
  categoryIds: z.array(z.string()).max(26),
});

export const getPersonalizedRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
    const recommendations = await RecommendationService.getPersonalizedRecommendations(userId, limit);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};

export const getBecauseYouWatched = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.json({ success: true, data: null });
      return;
    }
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
    const data = await RecommendationService.getBecauseYouWatched(req.user.id, limit);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const recordFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = feedbackSchema.parse(req.body);
    const feedback = await RecommendationService.recordFeedback(userId, data);
    res.status(201).json({
      success: true,
      message: 'Feedback recorded. Recommendation updated.',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

export const undoFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await RecommendationService.undoFeedback(userId, id);
    res.json({ success: true, message: 'Feedback removed successfully' });
  } catch (error) {
    next(error);
  }
};

export const resetRecommendations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await RecommendationService.resetRecommendations(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getCategoryPreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const prefs = await RecommendationService.getCategoryPreferences(userId);
    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
};

export const setCategoryPreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { categoryIds } = categoryPrefsSchema.parse(req.body);
    const updated = await RecommendationService.setCategoryPreferences(userId, categoryIds);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
