import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  isVerified?: boolean;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string };
      
      if (!decoded.userId) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { verification: true }
      });
      
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
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
