require('tsconfig-paths/register');
import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import os from 'os';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import connectDB from './config/database';
import apiRoutes from './routes/v1';
import { initializeSocketIO } from './config/socket';
import { initializeSocket } from './services/socket';
import 'services/telegram';

 



// Load environment variables
dotenv.config();
 
// Connect to MongoDB
connectDB();

// Create Express application
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocketIO(httpServer);

// Apply Socket.IO authentication middleware
///io.use(socketAuthMiddleware);

// Initialize socket event handlers
initializeSocket(io);

// Export io instance for use in routes
export { io };

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve as any);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EarnFrom API Documentation'
}) as any);

// Swagger JSON endpoint
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the server is running and get uptime information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Server is running successfully
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running successfully',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
     
app.use('/api', apiRoutes);

    
// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
}); 

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack);
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
httpServer.listen(PORT, async () => {
  const networkInterfaces = os.networkInterfaces();
  const localIP = Object.values(networkInterfaces)
    .flat()
    .find((iface) => iface && iface.family === 'IPv4' && !iface.internal)?.address || 'localhost';

  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://${localIP}:${PORT}/health`);
  console.log(`📍 API endpoint: http://${localIP}:${PORT}/api`);
  console.log(`🔌 WebSocket endpoint: ws://${localIP}:${PORT}/ws/withdraw`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
 
});

export default app;
