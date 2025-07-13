import { Router, Request, Response, NextFunction } from 'express';
import { MediaController } from './media.controller';
import { upload } from './middleware/upload.middleware';
import { CreateMediaDto, OptimizeMediaDto, CreateVariantDto } from './dtos/media.dto';
import { MediaService } from './services/media.service';
import { PrismaMediaFileRepository } from '@infrastructure/database';
import { logger } from '@shared/infrastructure';
import { Routes } from '@interfaces/routes.interface';
import { authMiddleware } from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';

export class MediaRoutes implements Routes {
  public path = '/api/media';
  public router = Router();
  public mediaController: MediaController;

  constructor() {
    logger.info('MediaRoutes constructor called');
    
    const mediaFileRepository = new PrismaMediaFileRepository();
    const mediaService = new MediaService(mediaFileRepository);
    
    this.mediaController = new MediaController(mediaService);
    logger.info('MediaController created');
    
    this.initializeRoutes();
    logger.info('MediaRoutes initialized');
  }

  private initializeRoutes() {
    logger.info(`Initializing MediaRoutes at: ${this.path}`);
    
    // Test route - sin autenticación para verificar que funciona
    this.router.get('/test', (req: Request, res: Response) => {
      logger.info('Test route hit');
      res.json({ success: true, message: 'MediaRoutes working!' });
    });

    // Upload file
    this.router.post(
      '/upload/:userId',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Upload route hit', { userId: req.params.userId });
        next();
      },
      authMiddleware,
      upload.single('file'),
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Upload middleware processing', { 
          hasFile: !!req.file, 
          userId: req.params.userId,
          body: req.body 
        });
        
        if (req.file) {
          req.body.originalName = req.file.originalname;
          req.body.mimeType = req.file.mimetype;
          req.body.size = req.file.size;
          req.body.isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
        }
        next();
      },
      this.mediaController.uploadFile.bind(this.mediaController)
    );

    // Get files by category
    this.router.get(
      '/by-category/:category',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Category route hit', { category: req.params.category });
        next();
      },
      authMiddleware,
      this.mediaController.getFilesByCategory.bind(this.mediaController)
    );

    // Get specific file by ID
    this.router.get(
      '/files/:fileId',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Get file by ID route hit', { fileId: req.params.fileId });
        next();
      },
      authMiddleware,
      this.mediaController.getFileById.bind(this.mediaController)
    );

    // Delete specific file
    this.router.delete(
      '/files/:fileId',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Delete file route hit', { fileId: req.params.fileId });
        next();
      },
      authMiddleware,
      this.mediaController.deleteFile.bind(this.mediaController)
    );

    // Create variant
    this.router.post(
      '/file/:fileId/variants',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Create variant route hit', { fileId: req.params.fileId });
        next();
      },
      authMiddleware,
      this.mediaController.createVariant.bind(this.mediaController)
    );

    // Optimize media
    this.router.post(
      '/optimize',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Optimize route hit');
        next();
      },
      authMiddleware,
      this.mediaController.optimizeMedia.bind(this.mediaController)
    );

    // List user files
    this.router.get(
      '/list',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('List files route hit');
        next();
      },
      authMiddleware,
      this.mediaController.listUserFiles.bind(this.mediaController)
    );

    // Get files with filters (debe ir al final)
    this.router.get(
      '/files',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Get files route hit', { query: req.query });
        next();
      },
      authMiddleware,
      this.mediaController.getFiles.bind(this.mediaController)
    );

    // Legacy routes
    this.router.get(
      '/files/:userId/:fileId',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Legacy get file route hit', { userId: req.params.userId, fileId: req.params.fileId });
        next();
      },
      authMiddleware,
      this.mediaController.getFile.bind(this.mediaController)
    );

    this.router.delete(
      '/files/:userId/:fileId',
      (req: Request, res: Response, next: NextFunction) => {
        logger.info('Legacy delete file route hit', { userId: req.params.userId, fileId: req.params.fileId });
        next();
      },
      authMiddleware,
      this.mediaController.deleteFile.bind(this.mediaController)
    );

    // Log registered routes
    this.logRegisteredRoutes();
  }

  private logRegisteredRoutes() {
    logger.info('=== MediaRoutes Stack ===');
    this.router.stack.forEach((layer: any, index: number) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        const path = `${this.path}${layer.route.path}`;
        logger.info(`${index}: ${methods} ${path}`);
      } else {
        logger.info(`${index}: Middleware - ${layer.name || 'unnamed'}`);
      }
    });
    logger.info('=== End MediaRoutes Stack ===');
  }
}

export default MediaRoutes;