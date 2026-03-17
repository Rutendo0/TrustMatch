import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface ServerToClientEvents {
  newMessage: (data: { matchId: string; message: any }) => void;
  messageRead: (data: { matchId: string; userId: string }) => void;
  userOnline: (data: { userId: string }) => void;
  userOffline: (data: { userId: string }) => void;
  typing: (data: { matchId: string; userId: string; isTyping: boolean }) => void;
  matchNotification: (data: { matchId: string; userId: string }) => void;
}

interface ClientToServerEvents {
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
  sendMessage: (data: { matchId: string; content: string; type: string }) => void;
  markRead: (matchId: string) => void;
  setTyping: (data: { matchId: string; isTyping: boolean }) => void;
  joinUserRoom: (userId: string) => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

// Track online users
const onlineUsers = new Map<string, string>(); // userId -> socketId

export const initializeSocket = (httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info(`User connected: ${userId} (socket: ${socket.id})`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Broadcast user online status
    socket.broadcast.emit('userOnline', { userId });

    // Handle joining match rooms
    socket.on('joinMatch', async (matchId: string) => {
      try {
        // Verify user is part of this match
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [{ user1Id: userId }, { user2Id: userId }],
            isActive: true,
          },
        });

        if (match) {
          socket.join(`match:${matchId}`);
          logger.debug(`User ${userId} joined match room: ${matchId}`);
        }
      } catch (error) {
        logger.error('Error joining match room:', error);
      }
    });

    // Handle leaving match rooms
    socket.on('leaveMatch', (matchId: string) => {
      socket.leave(`match:${matchId}`);
      logger.debug(`User ${userId} left match room: ${matchId}`);
    });

    // Handle sending messages via socket
    socket.on('sendMessage', async (data) => {
      try {
        const { matchId, content, type = 'TEXT' } = data;

        // Verify user is part of match
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [{ user1Id: userId }, { user2Id: userId }],
            isActive: true,
          },
        });

        if (!match) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            matchId,
            senderId: userId,
            content,
            type: type as any,
          },
          include: {
            sender: {
              select: { id: true, firstName: true },
            },
          },
        });

        // Notify other user in the match
        const recipientId = match.user1Id === userId ? match.user2Id : match.user1Id;
        io?.to(`match:${matchId}`).emit('newMessage', { matchId, message });
        
        // Also send notification to recipient's personal room
        io?.to(`user:${recipientId}`).emit('newMessage', { matchId, message });

        logger.debug(`Message sent in match ${matchId} by user ${userId}`);
      } catch (error) {
        logger.error('Error sending message via socket:', error);
      }
    });

    // Handle marking messages as read
    socket.on('markRead', async (matchId: string) => {
      try {
        const match = await prisma.match.findFirst({
          where: {
            id: matchId,
            OR: [{ user1Id: userId }, { user2Id: userId }],
            isActive: true,
          },
        });

        if (!match) return;

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

        const recipientId = match.user1Id === userId ? match.user2Id : match.user1Id;
        io?.to(`user:${recipientId}`).emit('messageRead', { matchId, userId });
      } catch (error) {
        logger.error('Error marking messages as read:', error);
      }
    });

    // Handle typing indicator
    socket.on('setTyping', (data) => {
      const { matchId, isTyping } = data;
      socket.to(`match:${matchId}`).emit('typing', { matchId, userId, isTyping });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      socket.broadcast.emit('userOffline', { userId });
    });
  });

  return io;
};

// Helper functions to emit events from routes
export const emitNewMessage = (matchId: string, message: any) => {
  io?.to(`match:${matchId}`).emit('newMessage', { matchId, message });
};

export const emitMessageRead = (matchId: string, userId: string) => {
  io?.to(`match:${matchId}`).emit('messageRead', { matchId, userId });
};

export const emitTyping = (matchId: string, userId: string, isTyping: boolean) => {
  io?.to(`match:${matchId}`).emit('typing', { matchId, userId, isTyping });
};

export const emitMatchNotification = (userId: string, matchId: string) => {
  io?.to(`user:${userId}`).emit('matchNotification', { userId, matchId });
};

export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

export const getIO = (): Server<ClientToServerEvents, ServerToClientEvents> | null => {
  return io;
};

export default {
  initializeSocket,
  emitNewMessage,
  emitMessageRead,
  emitTyping,
  emitMatchNotification,
  isUserOnline,
  getIO,
};
