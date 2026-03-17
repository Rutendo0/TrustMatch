import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/relationship — get the current user's relationship mode status
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const relationship = await prisma.relationshipMode.findFirst({
      where: {
        OR: [{ primaryUserId: userId }, { partnerUserId: userId }],
        isActive: true,
      },
      include: {
        primaryUser: {
          select: { id: true, firstName: true, photos: { where: { isMain: true }, take: 1 } },
        },
        partnerUser: {
          select: { id: true, firstName: true, photos: { where: { isMain: true }, take: 1 } },
        },
      },
    });

    res.json(relationship || null);
  } catch (error) {
    console.error('Get relationship error:', error);
    res.status(500).json({ error: 'Failed to get relationship status' });
  }
});

// POST /api/relationship — start relationship mode with a match partner
router.post(
  '/',
  [
    body('partnerId').isUUID(),
    body('anniversaryDate').optional().isISO8601(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { partnerId, anniversaryDate } = req.body;

      if (userId === partnerId) {
        throw new AppError('Cannot start relationship with yourself', 400);
      }

      // Verify there is an active match between the two users
      const match = await prisma.match.findFirst({
        where: {
          OR: [
            { user1Id: userId, user2Id: partnerId },
            { user1Id: partnerId, user2Id: userId },
          ],
          isActive: true,
        },
      });

      if (!match) {
        throw new AppError('No active match found with this user', 404);
      }

      // Check neither is already in relationship mode
      const existing = await prisma.relationshipMode.findFirst({
        where: {
          OR: [
            { primaryUserId: userId },
            { partnerUserId: userId },
            { primaryUserId: partnerId },
            { partnerUserId: partnerId },
          ],
          isActive: true,
        },
      });

      if (existing) {
        throw new AppError('One or both users are already in relationship mode', 400);
      }

      const relationship = await prisma.relationshipMode.create({
        data: {
          primaryUserId: userId,
          partnerUserId: partnerId,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          discoveryPaused: true,
          profileVisible: false,
        },
        include: {
          primaryUser: {
            select: { id: true, firstName: true },
          },
          partnerUser: {
            select: { id: true, firstName: true },
          },
        },
      });

      // Pause discovery for both users
      await prisma.user.updateMany({
        where: { id: { in: [userId, partnerId] } },
        data: { isActive: false },
      });

      res.status(201).json(relationship);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Start relationship error:', error);
      res.status(500).json({ error: 'Failed to start relationship mode' });
    }
  }
);

// PUT /api/relationship — update relationship settings
router.put(
  '/',
  [
    body('anniversaryDate').optional().isISO8601(),
    body('discoveryPaused').optional().isBoolean(),
    body('profileVisible').optional().isBoolean(),
    body('status').optional().isIn(['ACTIVE', 'PAUSED', 'ENDED']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;

      const relationship = await prisma.relationshipMode.findFirst({
        where: {
          OR: [{ primaryUserId: userId }, { partnerUserId: userId }],
          isActive: true,
        },
      });

      if (!relationship) {
        throw new AppError('No active relationship found', 404);
      }

      const { anniversaryDate, discoveryPaused, profileVisible, status } = req.body;

      const updated = await prisma.relationshipMode.update({
        where: { id: relationship!.id },
        data: {
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : undefined,
          discoveryPaused,
          profileVisible,
          status,
          updatedAt: new Date(),
        },
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Update relationship error:', error);
      res.status(500).json({ error: 'Failed to update relationship' });
    }
  }
);

// DELETE /api/relationship — end relationship mode
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const relationship = await prisma.relationshipMode.findFirst({
      where: {
        OR: [{ primaryUserId: userId }, { partnerUserId: userId }],
        isActive: true,
      },
    });

    if (!relationship) {
      throw new AppError('No active relationship found', 404);
    }

    await prisma.relationshipMode.update({
      where: { id: relationship.id },
      data: { isActive: false, status: 'ENDED', updatedAt: new Date() },
    });

    // Re-enable discovery for both users
    await prisma.user.updateMany({
      where: { id: { in: [relationship.primaryUserId, relationship.partnerUserId] } },
      data: { isActive: true },
    });

    res.json({ success: true, message: 'Relationship mode ended' });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('End relationship error:', error);
    res.status(500).json({ error: 'Failed to end relationship mode' });
  }
});

export default router;
