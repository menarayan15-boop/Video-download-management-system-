import { Router } from 'express';
import {
  getPlans,
  getMySubscription,
  checkoutSubscription,
  cancelSubscription,
} from './subscription.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

router.get('/plans', getPlans);
router.get('/me', authenticate, requireAuth, getMySubscription);
router.post('/checkout', authenticate, requireAuth, checkoutSubscription);
router.post('/cancel', authenticate, requireAuth, cancelSubscription);

export default router;
