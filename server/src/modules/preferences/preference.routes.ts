import { Router } from 'express';
import { getUserPreferences, updateUserPreferences } from './preference.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAuth, getUserPreferences);
router.patch('/', authenticate, requireAuth, updateUserPreferences);

export default router;
