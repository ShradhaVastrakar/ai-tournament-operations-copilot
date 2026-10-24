import { Request, Response } from 'express';
import { ApiError } from '../types';

export function notFound(_req: Request, res: Response) {
  const body: ApiError = { success: false, error: 'Not found', statusCode: 404 };
  res.status(404).json(body);
}
