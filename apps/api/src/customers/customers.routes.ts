import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customers.controller';
import { getCustomerDebt, createPayment, deletePayment } from '../payments/payments.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/:id/debt', getCustomerDebt);
router.post('/:id/payments', createPayment);
router.delete('/:id/payments/:batchId', deletePayment);

export default router;
