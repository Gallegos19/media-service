import { Response, NextFunction, Request } from 'express';
import { MediaStorageService } from './services/MediaStorageService';
import { cloudinaryStorageAdapter } from '@infrastructure/storage';
import { MediaFile, MediaCategory } from '@domain/entities/MediaFile';
import { MediaVariant } from '@domain/entities/MediaVariant';
import { IMediaFileRepository } from '@domain/repositories/IMediaFileRepository';
import { IMediaVariantRepository } from '@domain/repositories/IMediaVariantRepository';
import { PrismaMediaFileRepository } from '@infrastructure/database/prisma/repositories/PrismaMediaFileRepository';
import { PrismaMediaVariantRepository } from '@infrastructure/database/prisma/repositories/PrismaMediaVariantRepository';
import { 
  NotFoundException, 
  BadRequestException, 
  UnauthorizedException,
  HttpException
} from '@exceptions/HttpException';
import { MediaService } from './services/media.service';
import { logger } from '@shared/infrastructure';

// Extend the Express Request type to include the user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email?: string;
      role?: string;
    };
  }
}

interface MediaQueryParams {
  category?: string;
  isPublic?: string;
  userId?: string;
  maxResults?: string;
  includeVariants?: string;
  [key: string]: string | undefined;
}

interface MediaVariantOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  crop?: string;
  gravity?: string;
  variantName?: string;
}

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Endpoints para la gestión de archivos multimedia
 */
export class MediaController {
  private readonly mediaStorageService: MediaStorageService;
  private readonly mediaFileRepository: IMediaFileRepository;
  private readonly mediaVariantRepository: IMediaVariantRepository;
  private readonly mediaService: MediaService;

  constructor(mediaService: MediaService) {
    this.mediaService = mediaService;
    this.mediaStorageService = new MediaStorageService(cloudinaryStorageAdapter);
    this.mediaFileRepository = new PrismaMediaFileRepository();
    this.mediaVariantRepository = new PrismaMediaVariantRepository();
  }

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
  public getFilesByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      
      logger.info('getFilesByCategory called', { category });

      
      if (!Object.values(MediaCategory).includes(category as MediaCategory)) {
        throw new BadRequestException(`Categoría no válida. Las categorías permitidas son: ${Object.values(MediaCategory).join(', ')}`);
      }

      const files = await this.mediaFileRepository.findByCategory(category as MediaCategory);
      
      // Filtrar solo archivos público
      const filteredFiles = files.filter(file => 
        !file.isPublic
      );
      
      res.status(200).json({
        success: true,
        data: filteredFiles.map(file => this.formatMediaFileResponse(file))
      });
    } catch (error) {
      this.handleError(error, 'Error al obtener archivos por categoría', next);
    }
  };

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
  public getFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, isPublic, userId: queryUserId } = req.query as MediaQueryParams;
      const authUserId = req.user?.id;
      const targetUserId = queryUserId || authUserId;

      logger.info('getFiles called', { category, isPublic, queryUserId, authUserId });

      if (!targetUserId) {
        throw new UnauthorizedException('Se requiere autenticación o un ID de usuario válido');
      }

      const filters = {
        category: category as MediaCategory | undefined,
        isPublic: isPublic ? isPublic === 'true' : undefined,
        uploadedByUserId: targetUserId
      };

      const files = await this.mediaFileRepository.findByFilters(filters);

      res.status(200).json({
        success: true,
        data: files.map(file => this.formatMediaFileResponse(file)),
      });
    } catch (error) {
      this.handleError(error, 'Error al obtener archivos', next);
    }
  };

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
  public getFileById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const { includeVariants } = req.query as { includeVariants?: string };
      const shouldIncludeVariants = includeVariants === 'true';

      const file = await this.mediaFileRepository.findById(fileId);
      
      if (!file) {
        throw new NotFoundException('Archivo no encontrado');
      }

      let variants: MediaVariant[] = [];
      if (shouldIncludeVariants) {
        variants = await this.mediaVariantRepository.findByOriginalFileId(fileId);
      }

      res.status(200).json({
        success: true,
        data: {
          ...this.formatMediaFileResponse(file),
          ...(shouldIncludeVariants && { variants: variants.map(v => this.formatMediaVariantResponse(v)) })
        },
      });
    } catch (error) {
      this.handleError(error, 'Error al obtener el archivo', next);
    }
  };

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
  public uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { category, isPublic, uploadPurpose } = req.body;

      logger.info('uploadFile called', { 
        userId, 
        category, 
        isPublic,
        hasFile: !!req.file,
        fileInfo: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : null
      });


      if (!req.file) {
        throw new BadRequestException('No se proporcionó ningún archivo');
      }

      if (!userId) {
        throw new BadRequestException('Se requiere el ID de usuario');
      }

      // Validate category against MediaCategory enum
      if (!category || !Object.values(MediaCategory).includes(category as MediaCategory)) {
        throw new BadRequestException(`Categoría inválida. Las categorías válidas son: ${Object.values(MediaCategory).join(', ')}`);
      }

      const mediaFile = await this.mediaStorageService.uploadMedia(
        req.file,
        userId,
        {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          category: category as MediaCategory,
          isPublic: isPublic === 'true',
          uploadPurpose,
          folder: `users/${userId}`,
        }
      );

      // Guardar en la base de datos
      await this.mediaFileRepository.save(mediaFile);
      
      // Obtener el archivo guardado usando el ID
      const savedFile = await this.mediaFileRepository.findById(mediaFile.id.toString());
      
      if (!savedFile) {
        throw new Error('Error al guardar el archivo en la base de datos');
      }

      logger.info('File uploaded successfully', { fileId: savedFile.id });

      res.status(201).json({
        success: true,
        data: this.formatMediaFileResponse(savedFile)
      });
    } catch (error) {
      this.handleError(error, 'Error al cargar el archivo', next);
    }
  };

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
  public deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId, userId: paramUserId } = req.params;
      const { userId: queryUserId } = req.query;
      
      // Usar userId de params, query, o usuario autenticado
      const targetUserId = paramUserId || queryUserId ;

      logger.info('deleteFile called', { fileId, paramUserId, queryUserId, targetUserId });



      const mediaFile = await this.mediaFileRepository.findById(fileId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo no encontrado');
      }

      // Eliminar el archivo del almacenamiento
      await this.mediaStorageService.deleteMedia(mediaFile, targetUserId as string);

      // Eliminar variantes
      await this.mediaVariantRepository.deleteByOriginalFileId(fileId);

      // Eliminar de la base de datos
      await this.mediaFileRepository.delete(fileId);

      logger.info('File deleted successfully', { fileId });

      res.status(200).json({
        success: true,
        message: 'Archivo eliminado correctamente',
      });
    } catch (error) {
      this.handleError(error, 'Error al eliminar el archivo', next);
    }
  };

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
  public createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const { width, height, quality, format, crop, gravity, variantName } = req.body;
      const userId = req.user?.id;

      logger.info('createVariant called', { fileId, userId, variantOptions: { width, height, quality, format, variantName } });

      if (!userId) {
        throw new UnauthorizedException('Se requiere autenticación');
      }

      const mediaFile = await this.mediaFileRepository.findById(fileId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo no encontrado');
      }

      // Verificar que el usuario sea el propietario
      if (mediaFile.uploadedByUserId !== userId) {
        throw new UnauthorizedException('No tienes permiso para crear variantes de este archivo');
      }

      const { variant, url } = await this.mediaStorageService.createMediaVariant(
        mediaFile,
        {
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined,
          quality: quality ? parseInt(quality) : undefined,
          format,
          crop,
          gravity,
          variantName: variantName || 'custom',
        }
      );

      // Guardar la variante en la base de datos
      const savedVariant = await this.mediaVariantRepository.save(variant);

      logger.info('Variant created successfully', { variantId: savedVariant.id });

      res.status(201).json({
        success: true,
        data: {
          ...this.formatMediaVariantResponse(savedVariant),
          url,
        },
      });
    } catch (error) {
      this.handleError(error, 'Error al crear la variante', next);
    }
  };

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
  public optimizeMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mediaId, options } = req.body;
      const userId = req.user?.id;

      logger.info('optimizeMedia called', { mediaId, userId, options });

      if (!userId) {
        throw new UnauthorizedException('Se requiere autenticación');
      }

      if (!mediaId) {
        throw new BadRequestException('Se requiere el ID del archivo');
      }

      // Get the media file
      const mediaFile = await this.mediaFileRepository.findById(mediaId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo de medios no encontrado');
      }

      // Verify ownership
      if (mediaFile.uploadedByUserId !== userId) {
        throw new UnauthorizedException('No autorizado para optimizar este archivo');
      }

      // TODO: Implement actual optimization logic here
      // This would typically involve creating optimized variants
      const optimizationResult = await this.mediaStorageService.createMediaVariant(
        mediaFile,
        {
          quality: options?.quality || 80,
          width: options?.width,
          height: options?.height,
          format: options?.format || 'webp',
          variantName: 'optimized'
        }
      );

      // Save the optimized variant
      await this.mediaVariantRepository.save(optimizationResult.variant);

      logger.info('Media optimization completed', { mediaId, variantId: optimizationResult.variant.id });

      res.status(200).json({
        success: true,
        message: 'Optimización de medios completada correctamente',
        data: {
          mediaId,
          status: 'completed',
          optimizedVariant: this.formatMediaVariantResponse(optimizationResult.variant),
          optimizedUrl: optimizationResult.url
        }
      });
    } catch (error) {
      this.handleError(error, 'Error al optimizar el archivo', next);
    }
  };

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
  public listUserFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { page = '1', limit = '10', category } = req.query as {
        page?: string;
        limit?: string;
        category?: string;
      };

      logger.info('listUserFiles called', { userId, page, limit, category });

      if (!userId) {
        throw new UnauthorizedException('Se requiere autenticación');
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException('Parámetros de paginación inválidos');
      }

      const result = await this.mediaFileRepository.findByUserId(userId, pageNum, limitNum);

      // Aplicar filtro de categoría si se proporciona
      let filteredItems = result.items;
      if (category && Object.values(MediaCategory).includes(category as MediaCategory)) {
        filteredItems = result.items.filter(file => file.mediaCategory === category);
      }

      res.status(200).json({
        success: true,
        data: {
          items: filteredItems.map(file => this.formatMediaFileResponse(file)),
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
            hasNext: result.hasNext,
            hasPrevious: result.hasPrevious
          }
        }
      });
    } catch (error) {
      this.handleError(error, 'Error al listar archivos del usuario', next);
    }
  };

  // Métodos legacy para compatibilidad (si los necesitas)
  public getFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId, userId: paramUserId } = req.params;
      const { includeVariants } = req.query as { includeVariants?: string };
      const authUserId = req.user?.id;

      logger.info('getFile (legacy) called', { fileId, paramUserId, authUserId });

      // Redirigir al método principal
      req.params.fileId = fileId;
      req.query.includeVariants = includeVariants;
      
      return this.getFileById(req, res, next);
    } catch (error) {
      this.handleError(error, 'Error al obtener el archivo', next);
    }
  };

  /**
   * Formatea la respuesta de un archivo multimedia
   */
  private formatMediaFileResponse(mediaFile: MediaFile) {
    return {
      id: mediaFile.id.toString(),
      originalName: mediaFile.originalFilename,
      fileType: mediaFile.fileType,
      mimeType: mediaFile.mimeType,
      fileSize: mediaFile.fileSizeBytes,
      category: mediaFile.mediaCategory,
      publicUrl: mediaFile.publicUrl,
      isPublic: mediaFile.isPublic,
      isProcessed: mediaFile.isProcessed,
      virusScanStatus: mediaFile.virusScanStatus,
      downloadCount: mediaFile.downloadCount,
      metadata: mediaFile.metadata,
      uploadedByUserId: mediaFile.uploadedByUserId,
      createdAt: mediaFile.createdAt,
      updatedAt: mediaFile.updatedAt,
    };
  }

  /**
   * Formatea la respuesta de una variante de archivo multimedia
   */
  private formatMediaVariantResponse(variant: MediaVariant) {
    return {
      id: variant.id.toString(),
      originalFileId: variant.originalFileId,
      variantType: variant.variantType,
      width: variant.width,
      height: variant.height,
      quality: variant.quality,
      format: variant.format,
      publicUrl: variant.publicUrl,
      metadata: variant.metadata,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  /**
   * Maneja los errores de manera consistente
   */
  private handleError(error: unknown, defaultMessage: string, next: NextFunction): void {
    if (error instanceof HttpException) {
      next(error);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    logger.error(`${defaultMessage}:`, { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    if (error instanceof Error) {
      next(new Error(`${defaultMessage}: ${error.message}`));
    } else {
      next(new Error(defaultMessage));
    }
  }

  /**
   * Valida la propiedad de un archivo
   */
  private async validateFileOwnership(fileId: string, userId: string): Promise<MediaFile> {
    const file = await this.mediaFileRepository.findById(fileId);
    
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (file.uploadedByUserId !== userId && !file.isPublic) {
      throw new UnauthorizedException('No tienes permiso para acceder a este archivo');
    }

    return file;
  }
}

export default MediaController;