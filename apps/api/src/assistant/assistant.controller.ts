import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { getAiConfig } from './assistant.llm';
import { runAssistant } from './assistant.agent';

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000, 'Tin nhắn tối đa 4000 ký tự'),
      })
    )
    .min(1)
    .max(40),
});

const MAX_HISTORY = 20;

export async function getAssistantStatus(req: AuthenticatedRequest, res: Response) {
  const { enabled, model } = getAiConfig();
  return res.json({ success: true, data: { enabled, model: enabled ? model : null } });
}

export async function chatWithAssistant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!getAiConfig().enabled) {
      return res.status(503).json({
        success: false,
        message: 'Trợ lý AI chưa được cấu hình. Hãy đặt GEMINI_API_KEY trong file .env của API.',
      });
    }

    const { messages } = ChatSchema.parse(req.body);
    const history = messages.slice(-MAX_HISTORY);
    if (history[history.length - 1].role !== 'user') {
      return res.status(400).json({ success: false, message: 'Tin nhắn cuối phải là của người dùng' });
    }

    const result = await runAssistant({ history, user: req.user! });
    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
