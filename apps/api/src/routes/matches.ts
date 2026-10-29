import { Router, Request, Response, NextFunction } from 'express';
import { getMatches } from '../services/matchesService';
import type { ApiResponse, Match, MatchStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
const router = Router();


const VALID_STATUSES: MatchStatus[] = ['scheduled', 'completed', 'pending_result'];

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, date } = req.query as Record<string, string | undefined>;

    if (status && !VALID_STATUSES.includes(status as MatchStatus)) {
      throw new AppError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, 'Invalid date format. Use YYYY-MM-DD.');
    }

    const matches = getMatches({ status: status as MatchStatus | undefined, date });
    const body: ApiResponse<Match[]> = { success: true, data: matches };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
