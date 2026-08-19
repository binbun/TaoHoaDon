import { Router } from 'express';
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  duplicateQuotation,
  downloadQuotationPdf,
} from './quotations.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Allow public or auth-guarded PDF download (with auth middleware)
router.use(requireAuth);

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.post('/', createQuotation);
router.patch('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.post('/:id/duplicate', duplicateQuotation);
router.get('/:id/pdf', downloadQuotationPdf);

export default router;
