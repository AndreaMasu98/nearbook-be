import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
}

/* Middleware per autenticazione JWT. Verifica il token e aggiunge userId a req. */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token mancante o non valido' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token scaduto o non valido' });
  }
}
