import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.get('/:matchId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;
    const { limit = 50, before } = req.query;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
        isActive: true,
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    const messages = await prisma.message.findMany({
      where: {
        matchId,
        ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    await prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json(messages.reverse());
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

router.post(
  '/:matchId',
  [
    body('content').trim().notEmpty().isLength({ max: 1000 }),
    body('type').optional().isIn(['TEXT', 'IMAGE', 'GIF']),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const { matchId } = req.params;
      const { content, type = 'TEXT' } = req.body;

      const match = await prisma.match.findFirst({
        where: {
          id: matchId,
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
          isActive: true,
        },
      });

      if (!match) {
        throw new AppError('Match not found', 404);
      }

      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          content,
          type,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
            },
          },
        },
      });

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Send message error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

router.put('/:matchId/read', async (req: AuthRequest, res: Response) => {
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
        isActive: true,
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    await prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

export default router;
