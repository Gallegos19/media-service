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
    /**
     * @swagger
     * /api/media/upload/{userId}:
     *   post:
     *     summary: Sube un nuevo archivo para un usuario específico
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - name: userId
     *         in: path
     *         description: ID del usuario propietario del archivo
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             required:
     *               - file
     *               - category
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *                 description: Archivo a subir (máx. 10MB)
     *               category:
     *                 type: string
     *                 enum: [image, video, audio, document, other]
     *                 description: Categoría del archivo
     *               isPublic:
     *                 type: boolean
     *                 default: false
     *                 description: Si el archivo es público
     *               uploadPurpose:
     *                 type: string
     *                 description: Propósito de la carga
     *     responses:
     *       201:
     *         description: Archivo subido exitosamente
     */
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
    /**
     * @swagger
     * /api/media/by-category/{category}:
     *   get:
     *     summary: Obtener archivos por categoría
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: category
     *         required: true
     *         schema:
     *           type: string
     *           enum: [image, video, document, audio, other]
     *         description: Categoría de los archivos a buscar
     *     responses:
     *       200:
     *         description: Lista de archivos de la categoría especificada
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/MediaFile'
     */
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
    /**
     * @swagger
     * /api/media/files/{fileId}:
     *   get:
     *     summary: Obtener un archivo por ID
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: fileId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del archivo
     *       - in: query
     *         name: includeVariants
     *         schema:
     *           type: boolean
     *           default: false
     *         description: Incluir variantes del archivo
     *     responses:
     *       200:
     *         description: Archivo encontrado
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/MediaFile'
     */
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
    /**
     * @swagger
     * /api/media/files/{fileId}:
     *   delete:
     *     summary: Eliminar un archivo
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: fileId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del archivo a eliminar
     *     responses:
     *       200:
     *         description: Archivo eliminado correctamente
     */
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
    /**
     * @swagger
     * /api/media/file/{fileId}/variants:
     *   post:
     *     summary: Crear una variante de un archivo
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: fileId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del archivo original
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               width:
     *                 type: integer
     *                 description: Ancho de la variante
     *               height:
     *                 type: integer
     *                 description: Alto de la variante
     *               quality:
     *                 type: integer
     *                 description: Calidad de la variante (0-100)
     *               format:
     *                 type: string
     *                 description: Formato de la variante
     *               variantName:
     *                 type: string
     *                 description: Nombre descriptivo de la variante
     *     responses:
     *       201:
     *         description: Variante creada exitosamente
     */
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
    /**
     * @swagger
     * /api/media/optimize:
     *   post:
     *     summary: Optimizar un archivo multimedia
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - mediaId
     *             properties:
     *               mediaId:
     *                 type: string
     *                 description: ID del archivo a optimizar
     *               options:
     *                 type: object
     *                 description: Opciones de optimización
     *     responses:
     *       200:
     *         description: Optimización programada correctamente
     */
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
    /**
     * @swagger
     * /api/media/list:
     *   get:
     *     summary: Listar archivos de un usuario con paginación
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Número de página
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Elementos por página
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filtrar por categoría
     *     responses:
     *       200:
     *         description: Lista paginada de archivos del usuario
     */
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
    /**
     * @swagger
     * /api/media/files:
     *   get:
     *     summary: Obtener archivos con filtros opcionales
     *     tags: [Media]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *           enum: [image, video, audio, document, other]
     *         description: Filtrar por categoría
     *       - in: query
     *         name: isPublic
     *         schema:
     *           type: boolean
     *         description: Filtrar por visibilidad
     *       - in: query
     *         name: userId
     *         schema:
     *           type: string
     *         description: ID del usuario (opcional, por defecto usa el usuario autenticado)
     *     responses:
     *       200:
     *         description: Lista de archivos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/MediaFile'
     */
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