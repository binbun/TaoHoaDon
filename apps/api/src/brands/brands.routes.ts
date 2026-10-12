import { Router } from 'express';
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from './brands.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getBrands);
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.patch('/:id', updateBrand);
router.delete('/:id', deleteBrand);

export default router;
