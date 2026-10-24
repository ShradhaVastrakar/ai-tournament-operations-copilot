import { Router } from 'express';
import type { ApiResponse } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const body: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  };
  res.json(body);
});

export default router;
