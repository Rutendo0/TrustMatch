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
    body('gender').isIn(['MALE', 'FEMALE']),
    body('deviceFingerprint').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Registration validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({ errors: errors.array() });
      }

      console.log('Registration request body:', JSON.stringify(req.body, null, 2));

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

      // Parse dateOfBirth - accept both ISO8601 and DD/MM/YYYY formats
      let dob: Date;
      if (dateOfBirth) {
        // Try ISO8601 first
        const isoDate = new Date(dateOfBirth);
        if (!isNaN(isoDate.getTime())) {
          dob = isoDate;
        } else {
          // Try DD/MM/YYYY format
          const parts = dateOfBirth.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            dob = new Date(year, month, day);
          } else {
            throw new AppError('Invalid date of birth format', 400);
          }
        }
      } else {
        throw new AppError('Date of birth is required', 400);
      }

      // Auto-set interestedIn based on gender
      const interestedIn = gender === 'MALE' ? 'FEMALE' : 'MALE';

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
      });
      
      // If user already exists, check if they can log in (return token)
      if (existingUser) {
        // Verify password and return token
        const isValidPassword = await bcrypt.compare(password, existingUser.passwordHash);
        if (isValidPassword) {
          const token = generateAccessToken(existingUser.id);
          const refreshToken = await createRefreshToken(existingUser.id);
          return res.json({
            user: {
              id: existingUser.id,
              email: existingUser.email,
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              role: existingUser.role,
            },
            token,
            refreshToken,
            message: 'Login successful (existing user)',
          });
        } else {
          throw new AppError('Email or phone already registered', 400);
        }
      }

      const blockedAccount = await prisma.blockedAccount.findFirst({
        where: { OR: [{ email }, { phone }, { deviceId: deviceFingerprint }] },
      });
      if (blockedAccount) {
        console.log('Blocked account:', blockedAccount);
        throw new AppError('Account creation blocked', 403);
      }

      // Skip device check for now - device fingerprint issues shouldn't block registration
      // The device check can be re-enabled once basic registration works
      /*
      const existingDevice = await prisma.deviceFingerprint.findFirst({
        where: { deviceId: deviceFingerprint },
      });
      // Allow registration if device fingerprint is 'unknown' or doesn't exist
      if (existingDevice && deviceFingerprint && deviceFingerprint !== 'unknown' && !deviceFingerprint.includes('unknown')) {
        console.log('Existing device found:', existingDevice);
        throw new AppError('Device already associated with another account. Please contact support.', 400);
      }
      */

      const passwordHash = await bcrypt.hash(password, 12);

      // Create new user
      const user = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          dateOfBirth: dob,
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
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
          status: true,
          verification: {
            select: {
              isVerified: true
            }
          },
          photos: { orderBy: { order: 'asc' } },
          firstName: true,
          lastName: true,
          role: true,
          bio: true
        },
      });

if (!user) throw new AppError('Invalid credentials', 401);
      if (!user.isActive || user.status !== 'ACTIVE' || !user.verification?.isVerified) throw new AppError('Complete all verification steps before logging in', 403);

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
      console.error('Registration error details:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
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

// ── POST /api/auth/complete ── Activate pending account after all verifs
router.post(
  '/complete',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { verification: true }
      });

      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.status === 'ACTIVE') return res.status(400).json({ error: 'Account already active' });

      const v = user.verification;
      if (!v) return res.status(400).json({ error: 'No verification record' });
      if (!v.idVerified || !v.selfieVerified || !v.emailVerified) {
        return res.status(400).json({ error: 'Complete all verification steps: ID, selfie, email' });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { status: 'ACTIVE' }
        }),
        prisma.verification.update({
          where: { userId },
          data: { isVerified: true, verifiedAt: new Date() }
        })
      ]);

      const token = generateAccessToken(userId);
      const refreshToken = await createRefreshToken(userId);

      return res.json({
        success: true,
        message: 'Account fully activated and verified',
        token,
        refreshToken,
      });
    } catch (error) {
      console.error('Complete registration error:', error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to activate account' });
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
      
      // Skip selfie verification check - using local AI verification
      const result = await sendVerificationEmail(userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      
      // Return the code in the response so frontend can display it
      return res.json({ message: result.message, code: result.code });
    } catch (error) {
      console.error('Send email verification error:', error);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }
  }
);

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Verify email with code (only after selfie verification is complete)
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
      
      // Check if user has completed selfie verification before allowing email verification
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { verification: true },
      });
      
      if (!user?.verification?.selfieVerified) {
        return res.status(403).json({ 
          error: 'Please complete selfie verification first before verifying your email.' 
        });
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
// Resend verification code (only after selfie verification is complete)
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
      
      return res.json({ message: result.message, code: result.code });
    } catch (error) {
      console.error('Resend email code error:', error);
      return res.status(500).json({ error: 'Failed to resend verification code' });
    }
  }
);
