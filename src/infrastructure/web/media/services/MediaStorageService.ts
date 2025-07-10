import { IStorageService } from '@domain/services/IStorageService';
import { MediaFile, VirusScanStatus, MediaCategory } from '@domain/entities/MediaFile';
import { MediaVariant } from '@domain/entities/MediaVariant';
import { NotFoundException, ForbiddenException } from '@exceptions/HttpException';

export class MediaStorageService {
  constructor(private storageService: IStorageService) {}

  private getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }

  async uploadMedia(
    file: Express.Multer.File,
    userId: string,
    metadata: {
      originalName: string;
      mimeType: string;
      category: MediaCategory;
      isPublic?: boolean;
      uploadPurpose?: string;
      folder?: string;
    }
  ): Promise<MediaFile> {
    try {
      const resourceType = this.getResourceType(metadata.mimeType);
      const folder = metadata.folder || `users/${userId}`;

      // Verificar que el archivo tenga un buffer
      if (!file.buffer || file.buffer.length === 0) {
        throw new Error('El archivo está vacío o no se pudo leer correctamente');
      }

      console.log('Subiendo archivo a Cloudinary:', {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        resourceType,
        folder
      });

      // Subir el archivo a Cloudinary
      const uploadResult = await this.storageService.uploadFile(file, {
        folder,
        resource_type: resourceType,
        overwrite: false,
        invalidate: true,
      });

      console.log('Archivo subido exitosamente a Cloudinary:', {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        format: uploadResult.format
      });

      // Crear la entidad MediaFile
      const now = new Date();
      const mediaFile = MediaFile.create({
        originalFilename: metadata.originalName,
        fileType: uploadResult.format,
        mediaCategory: metadata.category,
        mimeType: metadata.mimeType,
        fileSizeBytes: uploadResult.bytes,
        uploadedByUserId: userId,
        uploadPurpose: metadata.uploadPurpose,
        storageProvider: 'cloudinary',
        storagePath: uploadResult.public_id,
        publicUrl: uploadResult.url,
        isPublic: metadata.isPublic || false,
        isProcessed: true, // Cloudinary procesa automáticamente los archivos
        virusScanStatus: VirusScanStatus.CLEAN, // Asumimos que Cloudinary escanea en busca de virus
        downloadCount: 0, // Initialize download count to 0
        widthPixels: uploadResult.width, // Add width in pixels
        heightPixels: uploadResult.height, // Add height in pixels
        metadata: {
          cloudinary_public_id: uploadResult.public_id,
          resource_type: uploadResult.resource_type,
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return mediaFile;
    } catch (error) {
      console.error('Error al cargar el archivo:', error);
      throw new Error('No se pudo cargar el archivo');
    }
  }

  async deleteMedia(mediaFile: MediaFile, userId: string): Promise<boolean> {
    try {
      // Verificar permisos
      if (mediaFile.uploadedByUserId !== userId) {
        throw new ForbiddenException('No tienes permiso para eliminar este archivo');
      }

      // Eliminar el archivo del almacenamiento
      const resourceType = this.getResourceType(mediaFile.mimeType);
      const deleted = await this.storageService.deleteFile(
        mediaFile.storagePath,
        resourceType
      );

      if (!deleted) {
        console.warn(`No se pudo eliminar el archivo ${mediaFile.id} del almacenamiento`);
      }

      return deleted;
    } catch (error) {
      console.error('Error al eliminar el archivo:', error);
      throw error;
    }
  }

  async createMediaVariant(
    originalFile: MediaFile,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png' | 'gif';
      crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb';
      gravity?: 'face' | 'center' | 'auto';
      variantName?: string;
    } = {}
  ): Promise<{ variant: MediaVariant; url: string }> {
    try {
      // Generar URL optimizada
      const optimizedUrl = await this.storageService.optimizeImage(
        originalFile.storagePath,
        {
          width: options.width,
          height: options.height,
          quality: options.quality,
          format: options.format as any,
          crop: options.crop,
          gravity: options.gravity,
        }
      );

      // Crear la entidad MediaVariant
      const now = new Date();
      const variant = MediaVariant.create({
        originalFileId: originalFile.id.toString(),
        variantType: options.variantName || 'optimized',
        widthPixels: options.width,
        heightPixels: options.height,
        qualityPercentage: options.quality,
        format: options.format,
        storagePath: `${originalFile.storagePath}_${options.variantName || 'optimized'}`,
        publicUrl: optimizedUrl,
        createdAt: now,
        updatedAt: now,
        metadata: {
          ...options,
          generatedAt: now.toISOString(),
        },
      });

      return { variant, url: optimizedUrl };
    } catch (error) {
      console.error('Error al crear variante de medio:', error);
      throw new Error('No se pudo crear la variante del archivo');
    }
  }

  async getMediaInfo(publicId: string, resourceType: string = 'image') {
    return this.storageService.getResourceInfo(publicId, resourceType);
  }

  async listUserMedia(userId: string, options: {
    maxResults?: number;
    prefix?: string;
    type?: string;
  } = {}) {
    const prefix = options.prefix || `users/${userId}/`;
    return this.storageService.listResources({
      prefix,
      max_results: options.maxResults || 50,
      type: options.type,
    });
  }
}
