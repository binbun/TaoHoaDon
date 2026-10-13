import { Router } from 'express';
import {
  handlePaymentWebhook,
  simulatePaymentWebhook,
  getPayments,
} from './payments.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public webhook ingestion endpoint (protected by secret header if configured)
router.post('/webhook', handlePaymentWebhook);

// Protected routes requiring user login
router.post('/simulate', requireAuth, simulatePaymentWebhook);
router.get('/', requireAuth, getPayments);

export default router;
