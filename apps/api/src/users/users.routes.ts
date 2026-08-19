import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from './users.controller';

const router = Router();

// Only SUPER_ADMIN and ADMIN can access user management routes
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetPassword);

export default router;
