import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getAuditLogs } from './audit.controller';

const router = Router();

// Only SUPER_ADMIN and ADMIN can view audit logs
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/', getAuditLogs);

export default router;
