import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// ── POST /api/reports — report a user ─────────────────────────────────────────
router.post(
  '/',
  [
    body('reportedId').isUUID(),
    body('reason').isIn([
      'FAKE_PROFILE',
      'INAPPROPRIATE_CONTENT',
      'HARASSMENT',
      'SPAM',
      'UNDERAGE',
      'SCAM',
      'OTHER',
    ]),
    body('details').optional().trim(),
    body('matchId').optional().isUUID(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reporterId = req.userId!;
      const { reportedId, reason, details, matchId } = req.body;

      if (reporterId === reportedId) throw new AppError('Cannot report yourself', 400);

      const reportedUser = await prisma.user.findUnique({ where: { id: reportedId } });
      if (!reportedUser) throw new AppError('User not found', 404);

      const existing = await prisma.userReport.findFirst({
        where: { reporterId, reportedId, reason },
      });
      if (existing) throw new AppError('You have already submitted this report', 400);

      const report = await prisma.userReport.create({
        data: { reporterId, reportedId, reason, details, matchId },
      });

      // Auto-suspend after 5 pending reports
      const reportCount = await prisma.userReport.count({
        where: { reportedId, status: 'PENDING' },
      });
      if (reportCount >= 5) {
        await prisma.user.update({ where: { id: reportedId }, data: { isActive: false } });
      }

      return res.status(201).json({ success: true, reportId: report.id });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Create report error:', error);
      return res.status(500).json({ error: 'Failed to submit report' });
    }
  }
);

// ── POST /api/reports/block — block a user ────────────────────────────────────
router.post(
  '/block',
  [body('blockedId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const blockerId = req.userId!;
      const { blockedId } = req.body;

      if (blockerId === blockedId) throw new AppError('Cannot block yourself', 400);

      const blockedUser = await prisma.user.findUnique({ where: { id: blockedId } });
      if (!blockedUser) throw new AppError('User not found', 404);

      // Idempotent upsert — silently succeeds if already blocked
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        update: {},
        create: { blockerId, blockedId },
      });

      // Deactivate any shared match
      await prisma.match.updateMany({
        where: {
          OR: [
            { user1Id: blockerId, user2Id: blockedId },
            { user1Id: blockedId, user2Id: blockerId },
          ],
          isActive: true,
        },
        data: { isActive: false },
      });

      // Remove pending swipes in both directions
      await prisma.swipe.deleteMany({
        where: {
          OR: [
            { swiperId: blockerId, swipedId: blockedId },
            { swiperId: blockedId, swipedId: blockerId },
          ],
        },
      });

      return res.json({ success: true, message: 'User blocked' });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Block user error:', error);
      return res.status(500).json({ error: 'Failed to block user' });
    }
  }
);

// ── GET /api/reports/blocked — list users I have blocked ─────────────────────
router.get('/blocked', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.userId!;

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: {
            id: true,
            firstName: true,
            photos: { where: { isMain: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = blocks.map((b) => ({
      id: b.blockedId,
      firstName: b.blocked.firstName,
      photo: b.blocked.photos[0]?.url || null,
      blockedAt: b.createdAt,
    }));

    return res.json(result);
  } catch (error) {
    console.error('Get blocked users error:', error);
    return res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

// ── DELETE /api/reports/block/:blockedId — unblock a user ─────────────────────
router.delete('/block/:blockedId', async (req: AuthRequest, res: Response) => {
  try {
    const blockerId = req.userId!;
    const { blockedId } = req.params;

    const existing = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) throw new AppError('Block not found', 404);

    await prisma.userBlock.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });

    return res.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Unblock user error:', error);
    return res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
