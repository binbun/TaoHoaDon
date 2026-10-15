import { Router } from 'express';
import {
  getPublicProducts,
  getPublicProductById,
  getPublicCategories,
  getPublicBrands,
} from './public.controller';

// Read-only, unauthenticated routes for the customer catalog (apps/catalog).
const router = Router();

router.get('/products', getPublicProducts);
router.get('/products/:id', getPublicProductById);
router.get('/categories', getPublicCategories);
router.get('/brands', getPublicBrands);

export default router;
