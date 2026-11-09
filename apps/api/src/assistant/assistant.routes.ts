import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import { chatWithAssistant, getAssistantStatus } from './assistant.controller';

const router = Router();

// Each chat message can trigger several paid AI calls
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ một phút.' },
});

router.use(requireAuth);

router.get('/status', getAssistantStatus);
router.post('/chat', chatLimiter, chatWithAssistant);

export default router;
