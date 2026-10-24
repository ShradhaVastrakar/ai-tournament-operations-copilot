import { Router } from 'express';
import { getVenues } from '../services/venuesService';
import type { ApiResponse, Venue } from '../types';

const router = Router();

router.get('/', (_req, res) => {
  const body: ApiResponse<Venue[]> = { success: true, data: getVenues() };
  res.json(body);
});

export default router;
