import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'default-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ userId }, secret, { expiresIn });
};

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('phone').notEmpty(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('dateOfBirth').isISO8601(),
    body('gender').isIn(['MALE', 'FEMALE', 'OTHER']),
    body('interestedIn').isIn(['MALE', 'FEMALE', 'BOTH']),
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
        interestedIn,
        deviceFingerprint,
      } = req.body;

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { phone }],
        },
      });

      if (existingUser) {
        throw new AppError('Email or phone already registered', 400);
      }

      const blockedAccount = await prisma.blockedAccount.findFirst({
        where: {
          OR: [
            { email },
            { phone },
            { deviceId: deviceFingerprint },
          ],
        },
      });

      if (blockedAccount) {
        throw new AppError('Account creation blocked', 403);
      }

      const existingDevice = await prisma.deviceFingerprint.findFirst({
        where: {
          deviceId: deviceFingerprint,
        },
      });

      if (existingDevice) {
        throw new AppError('Device already associated with another account', 400);
      }

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
          verification: {
            create: {},
          },
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
        include: {
          verification: true,
        },
      });

      const token = generateToken(user.id);

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          verification: user.verification,
        },
        token,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

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
          photos: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      const token = generateToken(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          bio: user.bio,
          photos: user.photos,
          verification: user.verification,
        },
        token,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

export default router;
