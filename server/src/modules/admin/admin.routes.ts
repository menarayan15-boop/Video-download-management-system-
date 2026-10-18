import { Router } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  deleteUser,
  getAdminVideos,
  getAdminModeration,
  updateReportStatus,
  getDownloadAuditLogs,
  updatePlanConfig,
} from './admin.controller.js';
import { authenticate, requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// All admin endpoints require ADMIN role
router.use(authenticate, requireAuth, requireRole(['ADMIN']));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/videos', getAdminVideos);
router.get('/moderation', getAdminModeration);
router.patch('/moderation/:id', updateReportStatus);
router.get('/downloads', getDownloadAuditLogs);
router.patch('/plans/:id', updatePlanConfig);

export default router;
