import { Server as SocketIOServer, ServerOptions } from 'socket.io';
import { Server as HTTPServer } from 'http';

export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/ws',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
}; 

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, socketConfig);
 
  console.log(`📍 WebSocket path: ${socketConfig.path}`);

  return io;
}
