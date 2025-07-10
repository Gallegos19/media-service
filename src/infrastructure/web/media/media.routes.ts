import { Router, Request, Response, NextFunction } from 'express';
import { MediaController } from './media.controller';
import { handleUploadError, upload } from './middleware/upload.middleware';
import { CreateMediaDto, UpdateMediaDto } from './dtos/media.dto';
import { MediaService } from './services/media.service';
import { authMiddleware, validationMiddleware } from '@middlewares';
import { PrismaMediaFileRepository } from '@infrastructure/database';
import { Routes } from '@interfaces';

export class MediaRoutes implements Routes {
  public path = '/api/media';
  public router = Router();
  public mediaController: MediaController;

  constructor() {
    const mediaFileRepository = new PrismaMediaFileRepository();
    const mediaService = new MediaService(mediaFileRepository);
    
    this.mediaController = new MediaController(mediaService);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/upload/:userId',
      authMiddleware,
      upload.single('file'),
      (req: Request, res: Response, next: NextFunction) => {
        // Extract file metadata and prepare for validation
        if (req.file) {
          req.body.originalName = req.file.originalname;
          req.body.mimeType = req.file.mimetype;
          req.body.size = req.file.size;
          
          // Ensure isPublic is a boolean
          if (req.body.isPublic !== undefined) {
            req.body.isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
          } else {
            req.body.isPublic = false; // Default to private
          }
        }
        next();
      },
      validationMiddleware(CreateMediaDto, 'body'),
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.uploadFile(req, res, next)
    );

    this.router.get(
      '/files',
      authMiddleware,
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.getFile(req, res, next)
    );

    this.router.delete(
      '/files/:userId/:fileId',
      authMiddleware,
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.deleteFile(req, res, next)
    );

 
    this.router.post(
      '/optimize',
      authMiddleware,
      validationMiddleware(UpdateMediaDto, 'body'),
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.optimizeMedia(req, res, next)
    );

    // Get files by category
    this.router.get(
      '/by-category/:category',
      authMiddleware,
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.getFilesByCategory(req, res, next)
    );

    // Get files with optional filters
    this.router.get(
      '/files',
      authMiddleware,
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.getFiles(req, res, next)
    );

    // Get file by ID for a specific user (alternative endpoint)
    this.router.get(
      '/files/:userId/:id',
      authMiddleware,
      (req: Request, res: Response, next: NextFunction) =>
        this.mediaController.getFileById(req, res, next)
    );
  }
}

export default MediaRoutes;
