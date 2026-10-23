import { Router } from 'express';
import { getDebtReport } from './reports.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/debt', getDebtReport);

export default router;
