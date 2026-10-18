import { Router } from 'express';
import {
  toggleLike,
  toggleSave,
  toggleFollow,
  getComments,
  addComment,
  editComment,
  deleteComment,
  recordWatchProgress,
  submitReport,
} from './social.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Video social actions
router.post('/videos/:id/like', authenticate, requireAuth, toggleLike);
router.delete('/videos/:id/like', authenticate, requireAuth, toggleLike);

router.post('/videos/:id/save', authenticate, requireAuth, toggleSave);
router.delete('/videos/:id/save', authenticate, requireAuth, toggleSave);

router.post('/videos/:id/watch-progress', authenticate, requireAuth, recordWatchProgress);

// Comments
router.get('/videos/:id/comments', authenticate, getComments);
router.post('/videos/:id/comments', authenticate, requireAuth, addComment);
router.patch('/comments/:id', authenticate, requireAuth, editComment);
router.delete('/comments/:id', authenticate, requireAuth, deleteComment);

// Follows
router.post('/users/:id/follow', authenticate, requireAuth, toggleFollow);
router.delete('/users/:id/follow', authenticate, requireAuth, toggleFollow);

// Moderation
router.post('/reports', authenticate, requireAuth, submitReport);

export default router;
