import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from './notification.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAuth, getNotifications);
router.patch('/:id/read', authenticate, requireAuth, markAsRead);
router.post('/mark-all-read', authenticate, requireAuth, markAllAsRead);
router.delete('/:id', authenticate, requireAuth, deleteNotification);
router.delete('/', authenticate, requireAuth, clearAllNotifications);

export default router;

