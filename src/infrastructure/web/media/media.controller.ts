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
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/MediaFile'
   */
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
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/MediaFile'
   */
  public getFilesByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category } = req.params;
      
      if (!Object.values(MediaCategory).includes(category as MediaCategory)) {
        throw new BadRequestException(`Categoría no válida. Las categorías permitidas son: ${Object.values(MediaCategory).join(', ')}`);
      }

      const files = await this.mediaFileRepository.findByCategory(category as MediaCategory);
      
      res.status(200).json({
        success: true,
        data: files.map(file => this.formatMediaFileResponse(file))
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
   *       401:
   *         description: No autorizado
   */
  /**
   * @swagger
   * /api/media/files:
   *   get:
   *     summary: Obtiene archivos del usuario con filtros opcionales
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
   *         description: Filtrar por visibilidad pública
   *     responses:
   *       200:
   *         description: Lista de archivos del usuario
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
  /**
   * @swagger
   * /api/media/files/{userId}:
   *   get:
   *     summary: Obtiene archivos de un usuario con filtros opcionales
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario
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
   *         description: Filtrar por visibilidad pública
   *     responses:
   *       200:
   *         description: Lista de archivos del usuario
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
   *         name: userId
   *         schema:
   *           type: string
   *         description: ID del usuario (opcional, por defecto usa el usuario autenticado)
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
   *         name: userId
   *         schema:
   *           type: string
   *         description: ID del usuario (opcional, por defecto usa el usuario autenticado)
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
   *     responses:
   *       200:
   *         description: Lista de archivos
   */
  public getFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, isPublic, userId: queryUserId } = req.query as MediaQueryParams;
      const authUserId = req.user?.id;
      const targetUserId = queryUserId || authUserId;

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
   * /api/media/files/{id}:
   *   get:
   *     summary: Obtener un archivo por ID
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo
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
   *       404:
   *         description: Archivo no encontrado
   *       401:
   *         description: No autorizado
   */
  /**
   * @swagger
   * /api/media/files/{userId}/{id}:
   *   get:
   *     summary: Obtiene un archivo específico por su ID
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario propietario
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo a buscar
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
  /**
   * @swagger
   * /api/media/files/{id}:
   *   get:
   *     summary: Obtener un archivo por ID
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo
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
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedException('Se requiere autenticación');
      }

      const file = await this.mediaFileRepository.findById(id);
      
      if (!file) {
        throw new NotFoundException('Archivo no encontrado');
      }

      if (file.uploadedByUserId !== userId && !file.isPublic) {
        throw new UnauthorizedException('No tienes permiso para ver este archivo');
      }

      res.status(200).json({
        success: true,
        data: this.formatMediaFileResponse(file),
      });
    } catch (error) {
      this.handleError(error, 'Error al obtener el archivo', next);
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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   type: object
   *                   properties:
   *                     mediaId:
   *                       type: string
   *                     status:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  public optimizeMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mediaId, options } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Get the media file
      const mediaFile = await this.mediaFileRepository.findById(mediaId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo de medios no encontrado');
      }

      // Verify ownership
      if (mediaFile.uploadedByUserId !== userId) {
        throw new Error('No autorizado para optimizar este archivo');
      }

      // TODO: Implement actual optimization logic here
      // This would typically involve:
      // 1. Processing the media file
      // 2. Creating optimized variants
      // 3. Updating the database with the new variants

      res.status(200).json({
        success: true,
        message: 'Optimización de medios programada correctamente',
        data: {
          mediaId,
          status: 'processing'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/media/upload:
   *   post:
   *     summary: Subir un nuevo archivo
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
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
   *                 description: Archivo a subir
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
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/MediaFile'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
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
   *         description: >
   *           🔑 ID del usuario propietario del archivo.
   *           Ejemplo: 123e4567-e89b-12d3-a456-426614174000
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         example: 123e4567-e89b-12d3-a456-426614174000
   *         x-example: 123e4567-e89b-12d3-a456-426614174000
   *         style: simple
   *         explode: false
   *         allowReserved: false
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
   *                 example: image
   *               isPublic:
   *                 type: boolean
   *                 default: false
   *                 description: Si el archivo es público
   *                 example: true
   *               uploadPurpose:
   *                 type: string
   *                 description: Propósito de la carga
   *                 example: profile_picture
   *     responses:
   *       201:
   *         description: Archivo subido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/MediaFile'
   *       400:
   *         description: Error en la solicitud (archivo faltante, categoría inválida, etc.)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "No se proporcionó ningún archivo"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       413:
   *         description: Archivo demasiado grande
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "El archivo excede el tamaño máximo permitido de 10MB"
   */
  public uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Iniciando carga de archivo. Datos recibidos:', {
        file: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer ? `Buffer de ${req.file.buffer.length} bytes` : 'No hay buffer'
        } : 'No se recibió archivo',
        params: req.params,
        body: req.body
      });

      if (!req.file) {
        throw new BadRequestException('No se proporcionó ningún archivo');
      }

      const { userId } = req.params;
      if (!userId) {
        throw new Error('Se requiere el ID de usuario');
      }

      const { category, isPublic, uploadPurpose } = req.body;

      // Validate category against MediaCategory enum
      if (!category || !Object.values(MediaCategory).includes(category as MediaCategory)) {
        throw new BadRequestException(`Categoría inválida. Las categorías válidas son: ${Object.values(MediaCategory).join(', ')}`);
      }

      console.log('Validaciones pasadas. Iniciando carga a Cloudinary...');

      try {
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

        console.log('Archivo cargado a Cloudinary. Guardando en base de datos...', {
          mediaFileId: mediaFile.id
        });

        // Guardar en la base de datos
        await this.mediaFileRepository.save(mediaFile);
        
        // Obtener el archivo guardado usando el ID
        const savedFile = await this.mediaFileRepository.findById(mediaFile.id.toString());
        
        if (!savedFile) {
          console.error('Error: No se pudo recuperar el archivo después de guardarlo');
          throw new Error('Error al guardar el archivo en la base de datos');
        }

        console.log('Archivo guardado exitosamente:', savedFile.id);

        res.status(201).json({
          success: true,
          data: this.formatMediaFileResponse(savedFile)
        });
      } catch (uploadError: unknown) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : 'Error desconocido al cargar el archivo';
        const errorStack = uploadError instanceof Error ? uploadError.stack : undefined;
        
        console.error('Error durante la carga del archivo:', {
          error: uploadError,
          message: errorMessage,
          stack: errorStack
        });
        throw new Error(`Error al cargar el archivo: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido en el controlador';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Error en el controlador uploadFile:', {
        error: errorMessage,
        stack: errorStack
      });
      
      if (error instanceof Error) {
        next(new Error(`Error al cargar el archivo: ${errorMessage}`));
      } else {
        next(new Error('Error desconocido al cargar el archivo'));
      }
    }
  };

  /**
   * @swagger
   * /api/media/files/{userId}/{fileId}:
   *   get:
   *     summary: Obtener un archivo específico de un usuario
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario propietario
   *       - in: path
   *         name: fileId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo a obtener
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
   *       400:
   *         description: ID de usuario no proporcionado
   *       403:
   *         description: No autorizado para ver este archivo
   *       404:
   *         description: Archivo no encontrado
   */
  /**
   * @swagger
   * /api/media/files/{fileId}:
   *   get:
   *     summary: Obtener un archivo específico
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: fileId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo a obtener
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: ID del usuario propietario (opcional, por defecto usa el usuario autenticado)
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
   *       400:
   *         description: ID de usuario no proporcionado
   *       403:
   *         description: No autorizado para ver este archivo
   *       404:
   *         description: Archivo no encontrado
   */
  public getFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const { userId: queryUserId, includeVariants } = req.query as { userId?: string; includeVariants?: string };
      const authUserId = req.user?.id;
      const targetUserId = queryUserId || authUserId;
      const shouldIncludeVariants = includeVariants === 'true';

      if (!targetUserId) {
        throw new UnauthorizedException('Se requiere autenticación o un ID de usuario válido');
      }

      const mediaFile = await this.mediaFileRepository.findById(fileId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo no encontrado');
      }

      // Verificar que el usuario sea el propietario o el archivo sea público
      if (mediaFile.uploadedByUserId !== targetUserId && !mediaFile.isPublic) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para ver este archivo',
        });
      }

      let variants: MediaVariant[] = [];
      if (shouldIncludeVariants) {
        variants = await this.mediaVariantRepository.findByOriginalFileId(fileId);
      }

      res.status(200).json({
        success: true,
        data: {
          ...this.formatMediaFileResponse(mediaFile),
          variants: variants.map(v => this.formatMediaVariantResponse(v)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/media/files/{userId}/{fileId}:
   *   delete:
   *     summary: Eliminar un archivo de un usuario específico
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del usuario propietario
   *       - in: path
   *         name: fileId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID del archivo a eliminar
   *     responses:
   *       200:
   *         description: Archivo eliminado correctamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: ID de usuario no proporcionado
   *       401:
   *         description: No autorizado
   *       404:
   *         description: Archivo no encontrado
   */
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
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: ID del usuario propietario (opcional, por defecto usa el usuario autenticado)
   *     responses:
   *       200:
   *         description: Archivo eliminado correctamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: ID de usuario no proporcionado
   *       401:
   *         description: No autorizado
   *       403:
   *         description: No tienes permiso para eliminar este archivo
   *       404:
   *         description: Archivo no encontrado
   */
  public deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const { userId: queryUserId } = req.query;
      const authUserId = req.user?.id;
      const targetUserId = queryUserId || authUserId;

      if (!targetUserId) {
        throw new BadRequestException('Se requiere un ID de usuario o autenticación válida');
      }

      const mediaFile = await this.mediaFileRepository.findById(fileId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo no encontrado');
      }

      // Verificar que el usuario sea el propietario
      if (mediaFile.uploadedByUserId !== targetUserId) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para eliminar este archivo',
        });
      }

      // Eliminar el archivo del almacenamiento
      await this.mediaStorageService.deleteMedia(mediaFile, targetUserId as string);

      // Eliminar de la base de datos
      await this.mediaFileRepository.delete(fileId);

      res.status(200).json({
        success: true,
        message: 'Archivo eliminado correctamente',
      });
    } catch (error) {
      next(error);
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
   *               crop:
   *                 type: string
   *                 description: Tipo de recorte
   *               gravity:
   *                 type: string
   *                 description: Punto de anclaje para el recorte
   *               variantName:
   *                 type: string
   *                 description: Nombre descriptivo de la variante
   *     responses:
   *       201:
   *         description: Variante creada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/MediaVariant'
   *                   properties:
   *                     url:
   *                       type: string
   *                       format: uri
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  public createVariant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fileId } = req.params;
      const { width, height, quality, format, crop, gravity, variantName } = req.body;

      const mediaFile = await this.mediaFileRepository.findById(fileId);
      if (!mediaFile) {
        throw new NotFoundException('Archivo no encontrado');
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
          variantName,
        }
      );

      // Guardar la variante en la base de datos
      const savedVariant = await this.mediaVariantRepository.save(variant);

      res.status(201).json({
        success: true,
        data: {
          ...this.formatMediaVariantResponse(savedVariant),
          url,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/media/files:
   *   get:
   *     summary: Listar archivos de un usuario
   *     tags: [Media]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: maxResults
   *         schema:
   *           type: integer
   *           default: 50
   *         description: Número máximo de resultados a devolver
   *       - in: query
   *         name: prefix
   *         schema:
   *           type: string
   *         description: Prefijo para filtrar archivos
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *         description: Tipo de archivo para filtrar
   *     responses:
   *       200:
   *         description: Lista de archivos del usuario
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
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  public listUserFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { maxResults, prefix, type } = req.query;

      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const files = await this.mediaStorageService.listUserMedia(userId, {
        maxResults: maxResults ? parseInt(maxResults as string) : undefined,
        prefix: prefix as string,
        type: type as string,
      });

      res.status(200).json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Formatea la respuesta de un archivo multimedia
   * @param mediaFile - Archivo multimedia a formatear
   * @returns Objeto con los datos formateados del archivo
   */
  private formatMediaFileResponse(mediaFile: MediaFile) {
    return {
      id: mediaFile.id,
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
   * @param variant - Variante a formatear
   * @returns Objeto con los datos formateados de la variante
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
   * @param error - Error capturado
   * @param defaultMessage - Mensaje por defecto
   * @param next - Función next de Express
   */
  private handleError(error: unknown, defaultMessage: string, next: NextFunction): void {
    if (error instanceof HttpException) {
      next(error);
      return;
    }

    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    logger.error(errorMessage, { error });
    
    if (error instanceof Error) {
      next(new Error(`${defaultMessage}: ${error.message}`));
    } else {
      next(new Error(defaultMessage));
    }
  }

  /**
   * Valida la propiedad de un archivo
   * @param fileId - ID del archivo
   * @param userId - ID del usuario
   * @returns Promesa con el archivo si es válido
   * @throws {NotFoundException} Si el archivo no existe
   * @throws {UnauthorizedException} Si el usuario no es el propietario
   */
  private async validateFileOwnership(fileId: string, userId: string): Promise<MediaFile> {
    const file = await this.mediaFileRepository.findById(fileId);
    
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (file.uploadedByUserId !== userId) {
      throw new UnauthorizedException('No tienes permiso para acceder a este archivo');
    }

    return file;
  }
}

export default MediaController;