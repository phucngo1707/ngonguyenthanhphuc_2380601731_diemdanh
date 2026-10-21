import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

let ioInstance: SocketIOServer | null = null;

export const initSocket = (io: SocketIOServer): void => {
  ioInstance = io;

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required for WebSocket connection'));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error('Invalid WebSocket authentication token'));
    }

    (socket as any).user = payload;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket.IO] Connected: ${user?.username} (${socket.id})`);

    // Join room for a specific attendance session
    socket.on('join_session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`[Socket.IO] User ${user?.username} joined session:${sessionId}`);
    });

    socket.on('leave_session', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      console.log(`[Socket.IO] User ${user?.username} left session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected: ${socket.id}`);
    });
  });
};

export const getIO = (): SocketIOServer | null => {
  return ioInstance;
};

export const emitToSession = (sessionId: string, event: string, data: any): void => {
  if (ioInstance) {
    ioInstance.to(`session:${sessionId}`).emit(event, data);
  }
};
