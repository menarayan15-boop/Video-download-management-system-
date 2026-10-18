import { Router } from 'express';
import {
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  recordFeedback,
  undoFeedback,
  resetRecommendations,
  getCategoryPreferences,
  setCategoryPreferences,
} from './recommendation.controller.js';
import { authenticate, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Public / Authenticated Recommendations (adapts if user token is provided)
router.get('/', authenticate, getPersonalizedRecommendations);
router.get('/because-you-watched', authenticate, getBecauseYouWatched);

// Authenticated feedback & preferences
router.post('/feedback', authenticate, requireAuth, recordFeedback);
router.delete('/feedback/:id', authenticate, requireAuth, undoFeedback);
router.delete('/reset', authenticate, requireAuth, resetRecommendations);

router.get('/preferences', authenticate, requireAuth, getCategoryPreferences);
router.put('/preferences', authenticate, requireAuth, setCategoryPreferences);

export default router;
