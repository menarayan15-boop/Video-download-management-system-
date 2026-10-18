import { Router } from 'express';
import {
  getVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  getCategories,
} from './video.controller.js';
import { authenticate, requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getVideos);
router.get('/categories', getCategories);
router.get('/:id', authenticate, getVideoById);
router.post('/', authenticate, requireAuth, requireRole(['CREATOR', 'ADMIN']), createVideo);
router.patch('/:id', authenticate, requireAuth, updateVideo);
router.delete('/:id', authenticate, requireAuth, deleteVideo);

export default router;
