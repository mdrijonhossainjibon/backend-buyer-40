import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ConnectionController,
  SwapController,
  WithdrawalController,
  ConverterSocketController,
} from '../controllers/socket';
import { UsersController } from 'controllers/socket/usersController';
 

 
const connectionController = new ConnectionController();
export const swapController = new SwapController();
export const withdrawalController = new WithdrawalController();

let converterController: ConverterSocketController; 


/**
 * Initialize socket handlers
 */
export function initializeSocket(io: SocketIOServer): void {
  swapController.setIO(io);
  withdrawalController.setIO(io);
  converterController = new ConverterSocketController(io);
  new UsersController(io);
 
  
  io.on('connection', (socket: Socket) => {
    // Handle connection
    const clientId = connectionController.onConnection(socket);
    
    // Register converter events
    converterController.registerEvents(socket);
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
       connectionController.onPing(socket);
    
    });

   
    

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${clientId} - Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      connectionController.onError(clientId, error);
    });
  });

  
 /*  setInterval(() => {
     const balanceUpdate = {
          type: 'user:balance:update',
          userId: 709148502,
          balance :   Math.random() * 100,
           
          timestamp: new Date(),
        };
    io.to(`user:709148502`).emit('user:balance:update', balanceUpdate );
  }, 5000); */
 
  setInterval(() => {
      io.emit('notification_received', { message: 'Hello World' })
  }, 1000);
}