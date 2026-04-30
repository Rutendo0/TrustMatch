import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '')
  || 'http://192.168.1.93:3000';

type MessageHandler = (data: { matchId: string; message: any }) => void;
type ReadHandler    = (data: { matchId: string; userId: string }) => void;
type TypingHandler  = (data: { matchId: string; userId: string; isTyping: boolean }) => void;
type PresenceHandler = (data: { userId: string }) => void;

class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync('authToken');
    if (!token) return;

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('connect_error', async (err) => {
      console.warn('[Socket] Connection error:', err.message);
      
      // Handle different authentication errors
      if (err.message === 'Invalid token' || 
          err.message === 'Authentication required' ||
          err.message === 'Token expired' ||
          err.message === 'Invalid token: signature mismatch') {
        console.warn('[Socket] Auth failed — token may be expired or invalid:', err.message);
        
        // If signature mismatch, the JWT_SECRET changed - clear the invalid token
        if (err.message === 'Invalid token: signature mismatch') {
          console.log('[Socket] Clearing invalid token due to signature mismatch');
          await SecureStore.deleteItemAsync('authToken');
        }
        
        // Clear the socket - the caller should handle refreshing token
        // and calling connect() again with a new token
        this.socket?.disconnect();
        this.socket = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinMatch(matchId: string): void {
    this.socket?.emit('joinMatch', matchId);
  }

  leaveMatch(matchId: string): void {
    this.socket?.emit('leaveMatch', matchId);
  }

  sendMessage(matchId: string, content: string, type = 'TEXT'): void {
    this.socket?.emit('sendMessage', { matchId, content, type });
  }

  markRead(matchId: string): void {
    this.socket?.emit('markRead', matchId);
  }

  setTyping(matchId: string, isTyping: boolean): void {
    this.socket?.emit('setTyping', { matchId, isTyping });
  }

  onNewMessage(handler: MessageHandler): () => void {
    this.socket?.on('newMessage', handler);
    return () => this.socket?.off('newMessage', handler);
  }

  onMessageRead(handler: ReadHandler): () => void {
    this.socket?.on('messageRead', handler);
    return () => this.socket?.off('messageRead', handler);
  }

  onTyping(handler: TypingHandler): () => void {
    this.socket?.on('typing', handler);
    return () => this.socket?.off('typing', handler);
  }

  onUserOnline(handler: PresenceHandler): () => void {
    this.socket?.on('userOnline', handler);
    return () => this.socket?.off('userOnline', handler);
  }

  onUserOffline(handler: PresenceHandler): () => void {
    this.socket?.on('userOffline', handler);
    return () => this.socket?.off('userOffline', handler);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
