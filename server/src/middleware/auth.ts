import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  isVerified?: boolean;
  body: any;
  params: any;
  query: any;
  headers: any;
  file?: any;
  files?: any;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Timeout wrapper to prevent hanging
  const timeoutMs = 10000; // 10 second timeout
  let isTimedOut = false;

  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    console.error('Auth middleware timed out');
  }, timeoutMs);

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      clearTimeout(timeoutId);
      if (isTimedOut) return;
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string };
      
      if (!decoded.userId) {
        clearTimeout(timeoutId);
        if (isTimedOut) return;
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Find user in database with timeout
      const user = await Promise.race([
        prisma.user.findUnique({
          where: { id: decoded.userId },
          include: { verification: true }
        }),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
        )
      ]);
      
      clearTimeout(timeoutId);
      if (isTimedOut) return;

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is suspended' });
      }

      const isVerified = user.verification?.isVerified ?? false;
      
      req.userId = user.id;
      req.isVerified = isVerified;
      
      return next();
    } catch (jwtError: unknown) {
      clearTimeout(timeoutId);
      if (isTimedOut) return;
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (isTimedOut) return;
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const verifiedAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // First run standard auth
  await authMiddleware(req, res, () => {});
  if (res.headersSent) return;

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fetch user to check status and verification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      verification: {
        select: {
          isVerified: true,
          idVerified: true,
          selfieVerified: true,
          emailVerified: true
        }
      }
    }
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.status !== 'ACTIVE' || !user.verification?.isVerified) {
    return res.status(403).json({ error: 'Account not fully verified. Complete all verification steps first.' });
  }

  req.isVerified = true;
  next();
};
