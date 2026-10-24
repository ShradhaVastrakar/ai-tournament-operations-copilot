import { Request, Response, NextFunction } from 'express';

// Logs method, path, status, and duration. Never logs headers or bodies.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
