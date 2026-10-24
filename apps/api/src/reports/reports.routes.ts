import { Router } from 'express';
import { getDebtReport } from './reports.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/debt', getDebtReport);

export default router;
