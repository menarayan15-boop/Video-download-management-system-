import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { CONFIG } from './config/constants.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import videoRoutes from './modules/videos/video.routes.js';
import socialRoutes from './modules/social/social.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscription.routes.js';
import downloadRoutes from './modules/downloads/download.routes.js';
import userRoutes from './modules/users/user.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import translationRoutes from './modules/translation/translation.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import recommendationRoutes from './modules/recommendations/recommendation.routes.js';
import playlistRoutes from './modules/playlists/playlist.routes.js';
import learningRoutes from './modules/learning/learning.routes.js';
import preferenceRoutes from './modules/preferences/preference.routes.js';
import watchRoomRoutes from './modules/watchRooms/watchRoom.routes.js';
import { discoveryRouter, adminDiscoveryRouter } from './modules/discovery/discovery.controller.js';
import {
  getFeaturedVideo,
  getFeaturedVideos,
  getFeaturedAdminDiagnostics,
  updateFeaturedAdminConfig,
} from './modules/videos/featured.controller.js';
import { authenticate, requireAuth, requireRole } from './middleware/auth.js';
import { Role } from '@prisma/client';

// Enable BigInt serialization to JSON strings
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [CONFIG.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger in dev
  if (CONFIG.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path}`);
      next();
    });
  }

  // Health checks
  const healthResponse = (req: any, res: any) => {
    res.json({
      status: 'healthy',
      platform: 'Vyntra',
      tagline: 'Watch. Connect. Discover.',
      timestamp: new Date().toISOString(),
      timezone: CONFIG.QUOTA_TIMEZONE,
    });
  };
  app.get('/api/health', healthResponse);
  app.get('/api/v1/health', healthResponse);

  // Featured Video Engine (Dynamic hero, rotation candidates, admin governance)
  app.get('/api/v1/featured-video', getFeaturedVideo);
  app.get('/api/v1/featured-videos', getFeaturedVideos);
  app.get('/api/v1/admin/featured-config', authenticate, requireAuth, requireRole([Role.ADMIN]), getFeaturedAdminDiagnostics);
  app.post('/api/v1/admin/featured-config', authenticate, requireAuth, requireRole([Role.ADMIN]), updateFeaturedAdminConfig);

  // Mount API modules under /api/v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/videos', videoRoutes);
  app.use('/api/v1/social', socialRoutes);
  app.use('/api/v1/subscriptions', subscriptionRoutes);
  app.use('/api/v1/downloads', downloadRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/recommendations', recommendationRoutes);
  app.use('/api/v1/playlists', playlistRoutes);
  app.use('/api/v1/learning', learningRoutes);
  app.use('/api/v1/preferences', preferenceRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/translate', translationRoutes);
  app.use('/api/v1/watch-rooms', watchRoomRoutes);
  app.use('/api/v1/admin/discovery', adminDiscoveryRouter);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1', discoveryRouter);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `Endpoint ${req.method} ${req.originalUrl} not found on Vyntra API`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
