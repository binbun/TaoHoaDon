import { Router } from 'express';
import {
  getProducts,
  getProductCategories,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  toggleFavoriteProduct,
} from './products.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getProducts);
router.get('/categories', getProductCategories);
router.post('/bulk-import', bulkImportProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.patch('/:id', updateProduct);
router.patch('/:id/toggle-favorite', toggleFavoriteProduct);
router.delete('/:id', deleteProduct);

export default router;
