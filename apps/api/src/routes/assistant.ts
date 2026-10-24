import { Router, Request, Response, NextFunction } from 'express';
import { getPlaceholderAnswer } from '../services/assistantService';
import type { ApiResponse, ChatRequest, ChatResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/chat', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, conversationId } = req.body as Partial<ChatRequest>;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new AppError(400, '"message" is required and must be a non-empty string.');
    }

    const result = getPlaceholderAnswer({ message: message.trim(), conversationId });
    const body: ApiResponse<ChatResponse> = { success: true, data: result };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
