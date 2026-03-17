import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /api/reviews — submit a verified review after a match/date
router.post(
  '/',
  [
    body('matchId').isUUID(),
    body('reviewedId').isUUID(),
    body('profileAccuracy').isInt({ min: 1, max: 5 }),
    body('conversationQuality').isInt({ min: 1, max: 5 }),
    body('authenticity').isInt({ min: 1, max: 5 }),
    body('punctuality').optional().isInt({ min: 1, max: 5 }),
    body('chemistry').optional().isInt({ min: 1, max: 5 }),
    body('overallRating').isFloat({ min: 1, max: 5 }),
    body('positives').optional().isArray(),
    body('improvements').optional().isArray(),
    body('additionalComments').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const reviewerId = req.userId!;
      const {
        matchId,
        reviewedId,
        profileAccuracy,
        conversationQuality,
        authenticity,
        punctuality,
        chemistry,
        overallRating,
        positives = [],
        improvements = [],
        additionalComments,
      } = req.body;

      if (reviewerId === reviewedId) {
        throw new AppError('Cannot review yourself', 400);
      }

      // Verify the match exists and the reviewer is part of it
      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [{ user1Id: reviewerId }, { user2Id: reviewerId }],
        },
      });

      if (!match) {
        throw new AppError('Match not found', 404);
      }

      // Ensure the reviewedId is the other person in the match
      const isValidReviewed =
        match.user1Id === reviewedId || match.user2Id === reviewedId;
      if (!isValidReviewed) {
        throw new AppError('Invalid reviewed user for this match', 400);
      }

      // Prevent duplicate reviews
      const existing = await prisma.verifiedReview.findFirst({
        where: { reviewerId, matchId },
      });
      if (existing) {
        throw new AppError('You have already reviewed this match', 400);
      }

      const review = await prisma.verifiedReview.create({
        data: {
          reviewerId,
          reviewedId,
          matchId,
          profileAccuracy,
          conversationQuality,
          authenticity,
          punctuality,
          chemistry,
          overallRating,
          positives,
          improvements,
          additionalComments,
        },
      });

      res.status(201).json(review);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Create review error:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  }
);

// GET /api/reviews/user/:userId — get public reviews for a user
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const reviews = await prisma.verifiedReview.findMany({
      where: {
        reviewedId: userId,
        isFlagged: false,
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        profileAccuracy: true,
        conversationQuality: true,
        authenticity: true,
        punctuality: true,
        chemistry: true,
        overallRating: true,
        positives: true,
        improvements: true,
        additionalComments: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const aggregates = await prisma.verifiedReview.aggregate({
      where: { reviewedId: userId, isFlagged: false },
      _avg: { overallRating: true },
      _count: { id: true },
    });

    res.json({
      reviews,
      summary: {
        totalReviews: aggregates._count.id,
        averageRating: aggregates._avg.overallRating
          ? Math.round(aggregates._avg.overallRating * 10) / 10
          : null,
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// GET /api/reviews/my — get reviews written by the current user
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId = req.userId!;

    const reviews = await prisma.verifiedReview.findMany({
      where: { reviewerId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;
