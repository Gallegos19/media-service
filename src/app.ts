import express, { Application, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS, API_DOCS_PATH } from './config';
import { logger, stream } from './shared/infrastructure/logger';
import ErrorMiddleware from './middlewares/error.middleware';
import { Routes } from './interfaces/routes.interface';
import { prisma } from './infrastructure/database/prisma';
import { setupSwagger } from './utils/swagger';

export class App {
  public app: Application;
  public env: string;
  public port: string | number;
  public server: HttpServer;
  public io: SocketIOServer | undefined;
  
  constructor(routes: Routes[] = []) {
    this.app = express();
    this.server = createServer(this.app);
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    if (routes && routes.length > 0) {
      this.initializeRoutes(routes);
    }
    this.initializeSwagger();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  public async listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        const serverUrl = `http://localhost:${this.port}`;
        const apiDocsUrl = `${serverUrl}${API_DOCS_PATH}`;
        
        logger.info(`
          ===========================================================
          🚀 Servidor Media Service iniciado correctamente 🚀
          ===========================================================
          Entorno: ${this.env}
          Puerto: ${this.port}
          URL del servidor: ${serverUrl}
          Documentación de la API: ${apiDocsUrl}
          Hora de inicio: ${new Date().toLocaleString()}
          ===========================================================
        `.replace(/^\s+/gm, '')); // Elimina la indentación del template literal
        resolve();
      }).on('error', (error: Error) => {
        logger.error('Error al iniciar el servidor:', error);
        reject(error);
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            logger.error('Error al cerrar el servidor:', error);
            return reject(error);
          }
          logger.info('Servidor HTTP cerrado correctamente');
          
          // Cerrar conexión de Prisma si es necesario
          if (prisma) {
            prisma.$disconnect()
              .then(() => {
                logger.info('Conexión a Prisma cerrada correctamente');
                resolve();
              })
              .catch((error: Error) => {
                logger.error('Error al cerrar la conexión a Prisma:', error);
                reject(error);
              });
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public getServer() {
    return this.app;
  }

  public getIO() {
    return this.io;
  }

  private initializeMiddlewares() {
    // Request logging
    this.app.use(morgan(LOG_FORMAT, { stream: { write: (message: string) => logger.info(message.trim()) } }));
    
    // Security headers
    this.app.use(helmet());
    
    // Enable CORS with more permissive settings for development
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow all origins in development
        if (this.env === 'development' || !origin) {
          callback(null, true);
        } else {
          // In production, use the configured origin
          const allowedOrigins = ORIGIN ? ORIGIN.split(',').map(o => o.trim()) : [];
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Total-Count'],
      maxAge: 600 // 10 minutes
    };

    this.app.use(cors(corsOptions));
    
    // Handle preflight requests
    this.app.options('*', cors(corsOptions));
    
    // Parse JSON request body
    this.app.use(express.json());
    
    // Parse URL-encoded request body
    this.app.use(express.urlencoded({ extended: true }));
    
    // Health check endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        message: 'Media Service is running',
        timestamp: new Date().toISOString(),
        env: this.env,
      });
    });
  }

  public initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      logger.info(`Mounted routes at: ${route.path}`);
      this.app.use(route.path, route.router);
    });
  }

  private initializeSwagger() {
    if (this.env === 'development' || this.env === 'staging') {
      setupSwagger(this.app);
    }
  }

  private initializeErrorHandling() {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Not Found',
      });
    });

    // Error handler
    this.app.use(ErrorMiddleware);
  }

  private initializeSocketIO() {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle file upload progress
      socket.on('upload-progress', (data: { uploadId: string; progress: number }) => {
        // Broadcast to all clients except sender
        socket.broadcast.emit(`upload-progress-${data.uploadId}`, data);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    
    try {
      // Close HTTP server
      this.server.close(async () => {
        logger.info('HTTP server closed.');
        
        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed.');
        
        // Close Socket.IO
        if (this.io) {
          this.io.close(() => {
            logger.info('Socket.IO server closed.');
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
}

// Crear una instancia de la aplicación sin rutas
const app = new App();

export { app };
export default app;
