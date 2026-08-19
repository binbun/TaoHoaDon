import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/stats', getDashboardStats);

export default router;
