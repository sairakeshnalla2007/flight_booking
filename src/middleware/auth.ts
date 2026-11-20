import { NextFunction, Request, Response } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  userName?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const session = (req as any).session;
  if (!session || !session.userId) {
    return res.status(401).json({ error: 'Unauthorized: Please log in first.' });
  }

  req.userId = session.userId;
  req.userEmail = session.userEmail;
  req.userName = session.userName;
  next();
};
