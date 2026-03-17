import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/admin/reports — list reports with optional filtering
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason, limit = 20, offset = 0 } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (reason) where.reason = reason;

    const [reports, total] = await Promise.all([
      prisma.userReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, firstName: true, email: true } },
          reported: { select: { id: true, firstName: true, email: true, isActive: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.userReport.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + Number(limit),
      },
    });
  } catch (error) {
    console.error('Admin get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// PUT /api/admin/reports/:id — update report status
router.put(
  '/reports/:id',
  [
    body('status').isIn(['REVIEWED', 'ACTIONED', 'DISMISSED']),
    body('reviewNote').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;
      const reviewedBy = req.userId!;

      const report = await prisma.userReport.findUnique({ where: { id } });
      if (!report) throw new AppError('Report not found', 404);

      const updated = await prisma.userReport.update({
        where: { id },
        data: { status, reviewedBy, reviewedAt: new Date() },
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Admin update report error:', error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  }
);

// GET /api/admin/users — list users with filtering
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, search, limit = 20, offset = 0 } = req.query;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastActive: true,
          verification: { select: { isVerified: true } },
          _count: { select: { reportsReceived: true, reportsMade: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: total > Number(offset) + Number(limit),
      },
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// POST /api/admin/users/:userId/ban — ban a user
router.post(
  '/users/:userId/ban',
  [body('reason').trim().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { reason } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { deviceFingerprints: { select: { deviceId: true } } },
      });

      if (!user) throw new AppError('User not found', 404);
      if (user.role === 'ADMIN') throw new AppError('Cannot ban an admin', 403);

      // Deactivate account
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Invalidate refresh tokens
      await prisma.refreshToken.deleteMany({ where: { userId } });

      // Add to blocked accounts list to prevent re-registration
      await prisma.blockedAccount.create({
        data: {
          email: user.email,
          phone: user.phone,
          reason,
        },
      });

      // Block all known device fingerprints
      if (user.deviceFingerprints.length > 0) {
        for (const { deviceId } of user.deviceFingerprints) {
          await prisma.blockedAccount.upsert({
            where: { id: deviceId },
            update: {},
            create: { deviceId, reason },
          }).catch(() => {
            // ignore if upsert fails on missing unique, create separately
            prisma.blockedAccount.create({ data: { deviceId, reason } }).catch(() => null);
          });
        }
        await prisma.deviceFingerprint.updateMany({
          where: { userId },
          data: { isBlocked: true },
        });
      }

      res.json({ success: true, message: `User ${user.email} banned` });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Admin ban user error:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  }
);

// POST /api/admin/users/:userId/unban — reactivate a banned user
router.post('/users/:userId/unban', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    // Remove from blocked accounts
    await prisma.blockedAccount.deleteMany({
      where: { OR: [{ email: user.email }, { phone: user.phone }] },
    });

    res.json({ success: true, message: `User ${user.email} unbanned` });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Admin unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// PUT /api/admin/users/:userId/role — promote or demote a user
router.put(
  '/users/:userId/role',
  [body('role').isIn(['USER', 'ADMIN'])],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const { role } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: { id: true, email: true, role: true },
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Admin update role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

export default router;
