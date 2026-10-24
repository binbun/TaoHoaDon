import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  downloadQuotationPdf,
  downloadQuotationImage,
} from './quotations.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Allow public or auth-guarded PDF/Image download (with auth middleware)
router.use(requireAuth);

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);
router.patch('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.get('/:id/pdf', downloadQuotationPdf);
router.get('/:id/image', downloadQuotationImage);
router.get('/:id/png', downloadQuotationImage);

export default router;
