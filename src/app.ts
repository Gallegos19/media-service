import express, { Application, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { NODE_ENV, PORT, LOG_FORMAT, ORIGIN, CREDENTIALS, API_DOCS_PATH } from '@config/index';
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
  
  constructor() {  // ← Removed routes parameter
    this.app = express();
    this.server = createServer(this.app);
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    this.initializeMiddlewares();
    this.initializeSwagger();
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
        `.replace(/^\s+/gm, ''));
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
    logger.info('Initializing middlewares...');
    
    // Request logging
    this.app.use(morgan(LOG_FORMAT, { stream: { write: (message: string) => logger.info(message.trim()) } }));
    
    // Security headers
    this.app.use(helmet());
    
    // Enable CORS with more permissive settings for development
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (this.env === 'development' || !origin) {
          callback(null, true);
        } else {
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
      maxAge: 600
    };

    this.app.use(cors(corsOptions));
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
    
    logger.info('Middlewares initialized');
  }

  public initializeRoutes(routes: Routes[]) {
    logger.info(`Initializing ${routes.length} route groups...`);
    
    routes.forEach((route, index) => {
      logger.info(`${index + 1}. Mounting routes at: ${route.path}`);
      
      // Debug: log the route object
      logger.info(`Route object:`, {
        path: route.path,
        hasRouter: !!route.router,
        routerStackLength: route.router?.stack?.length || 0
      });
      
      // Mount the router
      this.app.use(route.path, route.router);
      
      logger.info(`✅ Routes mounted successfully at: ${route.path}`);
    });
    
    // ¡IMPORTANTE! Inicializar error handling DESPUÉS de montar las rutas
    this.initializeErrorHandling();
    
    // Debug: Log all routes after mounting
    logger.info('=== All mounted routes ===');
    this.app._router?.stack?.forEach((layer: any, index: number) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        logger.info(`${index}: ${methods} ${layer.route.path}`);
      } else if (layer.name === 'router' && layer.regexp) {
        const pathRegex = layer.regexp.toString();
        logger.info(`${index}: Router - ${pathRegex}`);
        
        if (layer.handle?.stack) {
          layer.handle.stack.forEach((subLayer: any, subIndex: number) => {
            if (subLayer.route) {
              const methods = Object.keys(subLayer.route.methods).join(', ').toUpperCase();
              logger.info(`  ${index}.${subIndex}: ${methods} ${subLayer.route.path}`);
            }
          });
        }
      } else {
        logger.info(`${index}: ${layer.name || 'unnamed'} middleware`);
      }
    });
    logger.info('=== End mounted routes ===');
  }

  private initializeSwagger() {
    if (this.env === 'development' || this.env === 'master') {
      setupSwagger(this.app);
      logger.info('Swagger documentation initialized');
    }
  }

  private initializeErrorHandling() {
    logger.info('Initializing error handling...');
    
    // 404 handler - DEBE ir DESPUÉS de todas las rutas
    this.app.use((req: Request, res: Response) => {
      logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Not Found',
        path: req.path,
        method: req.method
      });
    });

    // Error handler - DEBE ir al final
    this.app.use(ErrorMiddleware);
    logger.info('Error handling initialized');
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

      socket.on('upload-progress', (data: { uploadId: string; progress: number }) => {
        socket.broadcast.emit(`upload-progress-${data.uploadId}`, data);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
    
    logger.info('Socket.IO initialized');
  }
}

// Crear una instancia de la aplicación sin rutas
const app = new App();

export { app };
export default app;