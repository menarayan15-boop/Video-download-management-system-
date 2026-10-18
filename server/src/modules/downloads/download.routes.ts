import { Router } from 'express';
import {
  getQuota,
  getDownloads,
  requestDownload,
  getDownloadById,
  retryDownload,
  cancelDownload,
  completeDownloadExplicit,
  streamDownloadMedia,
} from './download.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Stream delivery (token-authorized, public URL accessible by browser download manager)
router.get('/stream/:token', streamDownloadMedia);

// Quota and user operations
router.get('/quota', authenticate, requireAuth, getQuota);
router.get('/', authenticate, requireAuth, getDownloads);
router.post('/', authenticate, requireAuth, requestDownload);
router.get('/:id', authenticate, requireAuth, getDownloadById);
router.post('/:id/retry', authenticate, requireAuth, retryDownload);
router.post('/:id/cancel', authenticate, requireAuth, cancelDownload);
router.post('/:id/complete', authenticate, requireAuth, completeDownloadExplicit);

export default router;
