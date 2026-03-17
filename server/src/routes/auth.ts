import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendVerificationEmail, verifyEmailCode, resendVerificationCode } from '../services/emailService';

const router = Router();

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

const generateAccessToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;
  return jwt.sign({ userId }, secret, { expiresIn });
};

const createRefreshToken = async (userId: string): Promise<string> => {
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('dateOfBirth').isISO8601(),
    body('gender').isIn(['MALE', 'FEMALE']),
    body('deviceFingerprint').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email,
        phone,
        password,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        deviceFingerprint,
      } = req.body;

      // Auto-set interestedIn based on gender
      const interestedIn = gender === 'MALE' ? 'FEMALE' : 'MALE';

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
      });
      if (existingUser) throw new AppError('Email or phone already registered', 400);

      const blockedAccount = await prisma.blockedAccount.findFirst({
        where: { OR: [{ email }, { phone }, { deviceId: deviceFingerprint }] },
      });
      if (blockedAccount) throw new AppError('Account creation blocked', 403);

      const existingDevice = await prisma.deviceFingerprint.findFirst({
        where: { deviceId: deviceFingerprint },
      });
      if (existingDevice) throw new AppError('Device already associated with another account', 400);

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          interestedIn,
          verification: { create: {} },
          deviceFingerprints: {
            create: {
              deviceId: deviceFingerprint,
              platform: req.body.platform || 'unknown',
              osVersion: req.body.osVersion,
              appVersion: req.body.appVersion,
              ipAddress: req.ip,
            },
          },
        },
        include: { verification: true },
      });

      const token = generateAccessToken(user.id);
      const refreshToken = await createRefreshToken(user.id);

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verification: user.verification,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          verification: true,
          photos: { orderBy: { order: 'asc' } },
        },
      });

      if (!user) throw new AppError('Invalid credentials', 401);
      if (!user.isActive) throw new AppError('Account is suspended', 403);

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) throw new AppError('Invalid credentials', 401);

      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      const token = generateAccessToken(user.id);
      const refreshToken = await createRefreshToken(user.id);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          bio: user.bio,
          photos: user.photos,
          verification: user.verification,
        },
        token,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { refreshToken } = req.body;

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: { select: { id: true, isActive: true } } },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      if (!stored.user.isActive) {
        throw new AppError('Account is suspended', 403);
      }

      // Rotate: delete old, issue new
      await prisma.refreshToken.delete({ where: { token: refreshToken } });

      const newToken = generateAccessToken(stored.userId);
      const newRefreshToken = await createRefreshToken(stored.userId);

      return res.json({ token: newToken, refreshToken: newRefreshToken });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Token refresh error:', error);
      return res.status(500).json({ error: 'Token refresh failed' });
    }
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post(
  '/logout',
  [body('refreshToken').notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }
);

// ── POST /api/auth/change-password ────────────────────────────────────────────
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) throw new AppError('Current password is incorrect', 400);

      const newHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, updatedAt: new Date() },
      });

      // Invalidate all refresh tokens — force re-login on all devices
      await prisma.refreshToken.deleteMany({ where: { userId } });

      return res.json({
        success: true,
        message: 'Password changed. Please log in again on all devices.',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

export default router;

// ── POST /api/auth/send-email-verification ──────────────────────────────────────
// Send email verification code (only after ID + Selfie verification is complete)
router.post(
  '/send-email-verification',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const result = await sendVerificationEmail(userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      return res.json({ message: result.message });
    } catch (error) {
      console.error('Send email verification error:', error);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }
  }
);

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Verify email with code
router.post(
  '/verify-email',
  authMiddleware,
  [
    body('code').notEmpty().isLength({ min: 6, max: 6 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { code } = req.body;
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const result = await verifyEmailCode(userId, code);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      return res.json({ message: result.message });
    } catch (error) {
      console.error('Verify email error:', error);
      return res.status(500).json({ error: 'Failed to verify email' });
    }
  }
);

// ── POST /api/auth/resend-email-code ───────────────────────────────────────────
// Resend verification code
router.post(
  '/resend-email-code',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const result = await resendVerificationCode(userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      return res.json({ message: result.message });
    } catch (error) {
      console.error('Resend email code error:', error);
      return res.status(500).json({ error: 'Failed to resend verification code' });
    }
  }
);
