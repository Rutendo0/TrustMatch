import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post(
  '/swipe',
  [
    body('targetUserId').isUUID(),
    body('action').isIn(['LIKE', 'DISLIKE', 'SUPERLIKE']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { targetUserId, action } = req.body;

      if (userId === targetUserId) {
        throw new AppError('Cannot swipe on yourself', 400);
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { verification: true },
      });

      if (!targetUser) {
        throw new AppError('User not found', 404);
      }

      const existingSwipe = await prisma.swipe.findUnique({
        where: {
          swiperId_swipedId: {
            swiperId: userId,
            swipedId: targetUserId,
          },
        },
      });

      if (existingSwipe) {
        throw new AppError('Already swiped on this user', 400);
      }

      await prisma.swipe.create({
        data: {
          swiperId: userId,
          swipedId: targetUserId,
          action,
        },
      });

      let isMatch = false;

      if (action === 'LIKE' || action === 'SUPERLIKE') {
        const reciprocalSwipe = await prisma.swipe.findFirst({
          where: {
            swiperId: targetUserId,
            swipedId: userId,
            action: { in: ['LIKE', 'SUPERLIKE'] },
          },
        });

        if (reciprocalSwipe) {
          isMatch = true;

          const [user1Id, user2Id] = [userId, targetUserId].sort();

          await prisma.match.create({
            data: {
              user1Id,
              user2Id,
            },
          });
        }
      }

      res.json({
        success: true,
        isMatch,
        matchedUser: isMatch ? {
          id: targetUser.id,
          firstName: targetUser.firstName,
        } : null,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Swipe error:', error);
      res.status(500).json({ error: 'Swipe failed' });
    }
  }
);

// GET /api/matches/likes - Get people who liked the current user
router.get('/likes', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 20 } = req.query;

    // Find all users who have swiped LIKE on current user
    // but current user hasn't swiped on them yet
    const likedMe = await prisma.swipe.findMany({
      where: {
        swipedId: userId,
        action: { in: ['LIKE', 'SUPERLIKE'] },
      },
      include: {
        swiper: {
          include: {
            photos: { orderBy: { order: 'asc' } },
            verification: { select: { isVerified: true } },
          },
        },
      },
      take: Number(limit),
    });

    // Get current user's swipes to filter out
    const mySwipes = await prisma.swipe.findMany({
      where: { swiperId: userId },
      select: { swipedId: true },
    });
    const mySwipedIds = new Set(mySwipes.map(s => s.swipedId));

    // Filter to only show users who liked me and I haven't swiped yet
    const mutualLikes = likedMe.filter(swipe => !mySwipedIds.has(swipe.swiperId));

    const response = mutualLikes.map((swipe) => ({
      id: swipe.swiper.id,
      firstName: swipe.swiper.firstName,
      age: calculateAge(swipe.swiper.dateOfBirth),
      bio: swipe.swiper.bio,
      photos: swipe.swiper.photos.map(p => p.url),
      isVerified: swipe.swiper.verification?.isVerified || false,
      likedAt: swipe.createdAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('Get likes error:', error);
    res.status(500).json({ error: 'Failed to get likes' });
  }
});

// GET /api/matches/sent-likes - Get people the current user has liked
router.get('/sent-likes', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = 20 } = req.query;

    // Find all users that current user has swiped LIKE on
    const sentLikes = await prisma.swipe.findMany({
      where: {
        swiperId: userId,
        action: { in: ['LIKE', 'SUPERLIKE'] },
      },
      include: {
        swiped: {
          include: {
            photos: { orderBy: { order: 'asc' } },
            verification: { select: { isVerified: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    const response = sentLikes.map((swipe) => ({
      id: swipe.swiped.id,
      firstName: swipe.swiped.firstName,
      age: calculateAge(swipe.swiped.dateOfBirth),
      bio: swipe.swiped.bio,
      photos: swipe.swiped.photos.map(p => p.url),
      isVerified: swipe.swiped.verification?.isVerified || false,
      likedAt: swipe.createdAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('Get sent likes error:', error);
    res.status(500).json({ error: 'Failed to get sent likes' });
  }
});

// Helper function to calculate age
function calculateAge(dateOfBirth: Date | string | null): number {
  if (!dateOfBirth) return 25;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
        isActive: true,
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            photos: {
              where: { isMain: true },
              take: 1,
            },
            verification: {
              select: { isVerified: true },
            },
            lastActive: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            photos: {
              where: { isMain: true },
              take: 1,
            },
            verification: {
              select: { isVerified: true },
            },
            lastActive: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const responseMatches = matches.map((match: typeof matches[number]) => {
      const otherUser = match.user1Id === userId ? match.user2 : match.user1;
      const lastMessage = match.messages[0];

      return {
        id: match.id,
        user: {
          id: otherUser.id,
          firstName: otherUser.firstName,
          photo: otherUser.photos[0]?.url || null,
          isVerified: otherUser.verification?.isVerified || false,
          isOnline: isUserOnline(otherUser.lastActive),
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sentAt: lastMessage.createdAt,
          isRead: !!lastMessage.readAt,
        } : null,
        matchedAt: match.createdAt,
      };
    });

    res.json(responseMatches);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

router.delete('/:matchId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { isActive: false },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Unmatch error:', error);
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

function isUserOnline(lastActive: Date): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastActive >= fiveMinutesAgo;
}

export default router;
