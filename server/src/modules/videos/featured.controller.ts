import { Request, Response, NextFunction } from 'express';
import { featuredVideoService } from './featured.service.js';
import { AuthRequest } from '../../middleware/auth.js';

/**
 * GET /api/v1/featured-video
 * Returns a dynamically selected featured video from the active catalog.
 * Supports optional ?excludeId=... to avoid showing the same video on refresh/next click.
 */
export const getFeaturedVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const excludeId = typeof req.query.excludeId === 'string' ? req.query.excludeId : undefined;
    const video = await featuredVideoService.getSingleFeaturedVideo(excludeId);

    if (!video) {
      res.json({
        success: true,
        data: null,
        message: 'No eligible featured video currently available in the catalogue.',
      });
      return;
    }

    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/featured-videos
 * Returns a curated list of diverse candidate videos across categories for the Hero carousel.
 */
export const getFeaturedVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query.limit ? Math.min(Math.max(1, parseInt(String(req.query.limit), 10)), 12) : 6;
    const videos = await featuredVideoService.getFeaturedCandidates(limit);

    res.json({
      success: true,
      data: videos,
      count: videos.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/featured-config
 * Admin diagnostics and current pin configuration.
 */
export const getFeaturedAdminDiagnostics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const diagnostics = await featuredVideoService.getFeaturedDiagnostics();
    res.json({
      success: true,
      data: diagnostics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/featured-config
 * Update pinned video, pin duration, or diversity settings.
 */
export const updateFeaturedAdminConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dynamicEnabled, pinnedVideoId, pinExpiresAt, categoryDiversity, preferredCategories } = req.body;

    const updated = featuredVideoService.updateConfig({
      ...(typeof dynamicEnabled === 'boolean' ? { dynamicEnabled } : {}),
      ...(pinnedVideoId !== undefined ? { pinnedVideoId: pinnedVideoId || null } : {}),
      ...(pinExpiresAt !== undefined ? { pinExpiresAt: pinExpiresAt || null } : {}),
      ...(typeof categoryDiversity === 'boolean' ? { categoryDiversity } : {}),
      ...(Array.isArray(preferredCategories) ? { preferredCategories } : {}),
    });

    res.json({
      success: true,
      message: 'Featured video governance configuration updated.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
