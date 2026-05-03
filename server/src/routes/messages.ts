import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { emitMessageDeleted } from '../services/socketService';
import { cloudinary } from '../lib/cloudinary';

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

// ── POST /api/messages/:matchId/audio — upload audio and create message ──────
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/:matchId/audio', audioUpload.single('audio'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId } = req.params;
    const { duration } = req.body;

    if (!req.file) throw new AppError('Audio file required', 400);

    const match = await prisma.match.findFirst({
      where: { id: matchId, OR: [{ user1Id: userId }, { user2Id: userId }], isActive: true },
    });
    if (!match) throw new AppError('Match not found', 404);

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'trustmatch/chat-audio', resource_type: 'video' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file!.buffer);
    });

    const message = await prisma.message.create({
      data: {
        matchId,
        senderId: userId,
        content: uploadResult.secure_url,
        type: 'VOICE_NOTE' as any,
      },
    });

    res.status(201).json({
      id: message.id,
      audioUrl: uploadResult.secure_url,
      duration: parseInt(duration) || 0,
    });
  } catch (error) {
    if (error instanceof AppError) return res.status(error.statusCode).json({ error: error.message });
    console.error('Audio upload error:', error);
    res.status(500).json({ error: 'Failed to upload audio' });
  }
});

router.delete('/:matchId/:messageId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { matchId, messageId } = req.params;

    // Verify user is part of this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
        isActive: true,
      },
    });
    if (!match) throw new AppError('Match not found', 404);

    // Verify the message belongs to this user
    const message = await prisma.message.findFirst({
      where: { id: messageId, matchId, senderId: userId },
    });
    if (!message) throw new AppError('Message not found or not yours', 404);

    // Delete MessageStatus if exists (FK constraint), then the message
    try {
      await prisma.messageStatus.deleteMany({ where: { messageId } });
    } catch (_) {
      // MessageStatus may not exist, that's fine
    }
    await prisma.message.delete({ where: { id: messageId } });

    // Broadcast deletion to everyone in the match room
    emitMessageDeleted(matchId, messageId);

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

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
