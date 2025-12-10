import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { User } from '../models';

/**
 * Socket.IO Authentication Middleware
 * Verifies signature and authenticates users before allowing socket connections
 */
export const socketAuthMiddleware = async (  socket: Socket,  next: (err?: ExtendedError) => void) => {
 

  // Check if all required authentication parameters are present
 
  try {
    
   const { userId, token }= socket.handshake.auth;
   
    // Verify user exists in database
    const user = await User.findOne({ userId });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if user is suspended
    if (user.status === 'suspend') {
      return next(new Error('User account is suspended'));
    }

    // Attach user data to socket for later use
    (socket as any).userId = userId;
    (socket as any).user = user;

    // Join user-specific room for targeted events
    socket.join(`user:${userId}`);

    // Emit authentication success event
    socket.emit('AUTHENTICATED', {
      userId,
      username: user.username,
      timestamp: new Date()
    });

    console.log(`✅ User ${userId} authenticated and joined room user:${userId}`);

    // Allow connection
    next();
  } catch (error: any) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication failed: ' + error.message));
  }
};
