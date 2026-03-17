import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/date-journals/:matchId — get the current user's journal for a match
router.get('/:matchId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;

    // Verify the user is part of this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const journal = await prisma.dateJournal.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });

    res.json(journal || null);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get journal error:', error);
    res.status(500).json({ error: 'Failed to get date journal' });
  }
});

// POST /api/date-journals/:matchId — create or update a journal entry
router.post(
  '/:matchId',
  [
    body('dateTitle').optional().trim(),
    body('dateLocation').optional().trim(),
    body('dateTime').optional().isISO8601(),
    body('notes').optional().trim(),
    body('moodRating').optional().isInt({ min: 1, max: 5 }),
    body('wouldSeeAgain').optional().isBoolean(),
    body('memoryTags').optional().isArray(),
    body('photoUrls').optional().isArray(),
    body('isPrivate').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { matchId } = req.params;

      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
          isActive: true,
        },
      });

      if (!match) {
        throw new AppError('Match not found', 404);
      }

      const {
        dateTitle,
        dateLocation,
        dateTime,
        notes,
        moodRating,
        wouldSeeAgain,
        memoryTags = [],
        photoUrls = [],
        isPrivate = true,
      } = req.body;

      const journal = await prisma.dateJournal.upsert({
        where: { matchId_userId: { matchId, userId } },
        create: {
          matchId,
          userId,
          dateTitle,
          dateLocation,
          dateTime: dateTime ? new Date(dateTime) : undefined,
          notes,
          moodRating,
          wouldSeeAgain,
          memoryTags,
          photoUrls,
          isPrivate,
        },
        update: {
          dateTitle,
          dateLocation,
          dateTime: dateTime ? new Date(dateTime) : undefined,
          notes,
          moodRating,
          wouldSeeAgain,
          memoryTags,
          photoUrls,
          isPrivate,
          updatedAt: new Date(),
        },
      });

      res.status(201).json(journal);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Upsert journal error:', error);
      res.status(500).json({ error: 'Failed to save date journal' });
    }
  }
);

// DELETE /api/date-journals/:matchId — delete a journal entry
router.delete('/:matchId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;

    const journal = await prisma.dateJournal.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });

    if (!journal) {
      throw new AppError('Journal entry not found', 404);
    }

    await prisma.dateJournal.delete({
      where: { matchId_userId: { matchId, userId } },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Delete journal error:', error);
    res.status(500).json({ error: 'Failed to delete date journal' });
  }
});

export default router;
