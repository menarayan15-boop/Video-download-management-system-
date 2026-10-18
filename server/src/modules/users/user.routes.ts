import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getSavedVideos,
  getWatchHistory,
  getCreatorProfile,
  getRegisteredDevices,
  registerDevice,
  revokeDevice,
  getContinueWatching,
  removeContinueWatchingVideo,
  clearContinueWatching,
  deleteWatchHistoryItem,
  clearWatchHistory,
  clearSavedVideos,
} from './user.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/me', authenticate, requireAuth, getMyProfile);
router.patch('/me', authenticate, requireAuth, updateMyProfile);

// Saved Videos
router.get('/me/saved-videos', authenticate, requireAuth, getSavedVideos);
router.delete('/me/saved-videos', authenticate, requireAuth, clearSavedVideos);

// Continue Watching
router.get('/me/continue-watching', authenticate, requireAuth, getContinueWatching);
router.delete('/me/continue-watching/:videoId', authenticate, requireAuth, removeContinueWatchingVideo);
router.delete('/me/continue-watching', authenticate, requireAuth, clearContinueWatching);

// Full Watch History
router.get('/me/watch-history', authenticate, requireAuth, getWatchHistory);
router.delete('/me/watch-history/:videoId', authenticate, requireAuth, deleteWatchHistoryItem);
router.delete('/me/watch-history', authenticate, requireAuth, clearWatchHistory);

// Devices
router.get('/me/devices', authenticate, requireAuth, getRegisteredDevices);
router.post('/me/devices', authenticate, requireAuth, registerDevice);
router.delete('/me/devices/:id', authenticate, requireAuth, revokeDevice);

// Public creator profile
router.get('/creator/:id', authenticate, getCreatorProfile);

export default router;

