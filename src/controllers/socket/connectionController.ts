import { Socket } from 'socket.io';
import { ConnectedResponse } from './types';
import { generateClientId } from './utils';

/**
 * Connection Controller
 * Handles socket connection and general events
 */
export class ConnectionController {
  /**
   * Handle new socket connection
   */
  onConnection(socket: Socket): string {
    const clientId = generateClientId();
    
    // Send connection confirmation
    const connectedResponse: ConnectedResponse = {
      type: 'CONNECTED',
      clientId,
      message: 'Connected to Socket  service',
    };
    socket.emit('CONNECTED', connectedResponse);
     
    return clientId;
  }

  /**
   * Handle ping event
   */
  onPing(socket: Socket): void {
    socket.emit('pong', { timestamp: Date.now() });
  }

  /**
   * Handle socket error
   */
  onError(clientId: string, error: Error): void {
    console.error(`❌ Socket error for client ${clientId}:`, error);
  }
}
