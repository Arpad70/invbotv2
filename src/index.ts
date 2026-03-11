import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { db } from './config/database';
import { Logger } from './utils/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import portfolioRoutes from './routes/portfolios';
import strategyRoutes from './routes/strategies';
import tradeRoutes from './routes/trades';
import polymarketClobRoutes from './routes/polymarket-clob';

const logger = new Logger('Server');

export class InvBotServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private io: SocketIOServer;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors());

    // Body parser
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });

    // API Version
    this.app.get('/api/version', (_req, res) => {
      res.json({ version: '2.0.0', name: 'InvBot' });
    });

    // API v1 Routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/users', userRoutes);
    this.app.use('/api/v1/portfolios', portfolioRoutes);
    this.app.use('/api/v1/strategies', strategyRoutes);
    this.app.use('/api/v1/trades', tradeRoutes);
    this.app.use('/api/v1/polymarket/clob', polymarketClobRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        path: req.path,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled error', { error: error.message, stack: error.stack });
      
      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        ...(config.nodeEnv === 'development' && { stack: error.stack }),
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize database
      await db.initialize();

      // Mount Socket.IO handlers if needed
      this.setupSocketIO();

      // Start server
      this.httpServer.listen(config.port, () => {
        logger.info(`🚀 Server running on http://localhost:${config.port}`);
        logger.info(`📊 Environment: ${config.nodeEnv}`);
        logger.info(`🗄️  Database: ${config.database.database} on ${config.database.host}:${config.database.port}`);
      });
    } catch (error) {
      logger.error(`Failed to start server: ${error}`);
      process.exit(1);
    }
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('subscribe_portfolio', (portfolioId: number) => {
        socket.join(`portfolio_${portfolioId}`);
        logger.debug(`Client subscribed to portfolio ${portfolioId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async stop(): Promise<void> {
    await db.close();
    this.httpServer.close();
    logger.info('Server stopped');
  }
}

// Start server
const server = new InvBotServer();
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.stop();
});

export { server };
