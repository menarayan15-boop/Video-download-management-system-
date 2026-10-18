import { Router } from 'express';
import { translate, getLanguages } from './translation.controller.js';

const router = Router();

router.get('/languages', getLanguages);
router.post('/', translate);

export default router;
