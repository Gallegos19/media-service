import { MediaFile, MediaCategory, VirusScanStatus } from '@domain/entities/MediaFile';
import { MediaVariant } from '@domain/entities/MediaVariant';
import { IMediaFileRepository } from '@domain/repositories/IMediaFileRepository';
import { IMediaVariantRepository } from '@domain/repositories/IMediaVariantRepository';
import { IUploadSessionRepository } from '@domain/repositories/IUploadSessionRepository';
import { IProcessingJobRepository } from '@domain/repositories/IProcessingJobRepository';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Request } from 'express';
import multer from 'multer';
import { logger } from '@shared/infrastructure';
import { BadRequestException, NotFoundException } from '@exceptions/HttpException';
import { S3_CONFIG } from '@config/index';
const unlinkAsync = promisify(fs.unlink);

export class MediaService {
  private s3Client: S3Client;

  constructor(
    private mediaFileRepository: IMediaFileRepository,
    private mediaVariantRepository?: IMediaVariantRepository,
    private uploadSessionRepository?: IUploadSessionRepository,
    private processingJobRepository?: IProcessingJobRepository
  ) {
    this.s3Client = new S3Client({
      region: S3_CONFIG.region,
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
      },
      endpoint: S3_CONFIG.endpoint,
      forcePathStyle: S3_CONFIG.forcePathStyle,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    metadata: {
      originalName: string;
      mimeType: string;
      category: MediaCategory;
      isPublic?: boolean;
      uploadPurpose?: string;
    }
  ): Promise<MediaFile> {
    try {
      // Generate a unique file key for S3
      const fileExt = path.extname(file.originalname);
      const fileKey = `uploads/${userId}/${uuidv4()}${fileExt}`;
      
      // Upload file to S3
      const uploadParams = {
        Bucket: S3_CONFIG.bucketName,
        Key: fileKey,
        Body: fs.createReadStream(file.path),
        ContentType: file.mimetype,
        Metadata: {
          originalName: metadata.originalName,
          uploadedBy: userId,
        },
      };

      await this.s3Client.send(new PutObjectCommand(uploadParams));
      
      // Generate public URL
      const publicUrl = `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${fileKey}`;
      
      // Create media file record
      const mediaFile = MediaFile.create({
        originalFilename: metadata.originalName,
        fileType: path.extname(metadata.originalName).slice(1),
        mediaCategory: metadata.category,
        mimeType: metadata.mimeType,
        fileSizeBytes: file.size,
        uploadedByUserId: userId,
        uploadPurpose: metadata.uploadPurpose,
        storageProvider: 's3',
        storagePath: fileKey,
        publicUrl: metadata.isPublic ? publicUrl : undefined,
        isPublic: metadata.isPublic || false,
        isProcessed: false,
        virusScanStatus: VirusScanStatus.PENDING,
        metadata: {},
        downloadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Save to database
      await this.mediaFileRepository.save(mediaFile);
      
      // Schedule virus scanning and processing
      await this.scheduleMediaProcessing(mediaFile.id.toString());
      
      // Clean up the temporary file
      await unlinkAsync(file.path);
      
      return mediaFile;
    } catch (error) {
      // Clean up the temporary file in case of error
      if (file?.path && fs.existsSync(file.path)) {
        await unlinkAsync(file.path).catch(e => 
          logger.error(`Failed to delete temporary file: ${e.message}`)
        );
      }
      throw error;
    }
  }

  async getFileById(fileId: string, includeVariants: boolean = false): Promise<MediaFile> {
    const mediaFile = await this.mediaFileRepository.findById(fileId);
    
    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    // If the file is not public and the user is not the owner, deny access
    if (!mediaFile.isPublic && !this.isOwner(mediaFile, this.getCurrentUserId())) {
      throw new NotFoundException('File not found');
    }

    // Increment download count if it's a direct download
    mediaFile.incrementDownloadCount();
    await this.mediaFileRepository.update(mediaFile);

    // Get variants if requested
    if (includeVariants && this.mediaVariantRepository) {
      const variants = await this.mediaVariantRepository.findByOriginalFileId(fileId);
      // Attach variants to the media file
      (mediaFile as any).variants = variants;
    }

    return mediaFile;
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const mediaFile = await this.mediaFileRepository.findById(fileId);
    
    if (!mediaFile) {
      throw new NotFoundException('File not found');
    }

    // Only the owner can delete the file
    if (!this.isOwner(mediaFile, userId)) {
      throw new BadRequestException('You do not have permission to delete this file');
    }

    // Delete from storage
    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: S3_CONFIG.bucketName,
        Key: mediaFile.storagePath,
      }));

      // Delete variants if any
      if (this.mediaVariantRepository) {
        await this.mediaVariantRepository.deleteByOriginalFileId(fileId);
      }

      // Delete the file record
      await this.mediaFileRepository.delete(fileId);
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId}:`, error);
      throw new Error('Failed to delete file');
    }
  }

  async optimizeMedia(fileId: string, options: {
    quality?: number;
    width?: number;
    height?: number;
    format?: string;
  }): Promise<MediaVariant> {
    const mediaFile = await this.getFileById(fileId);
    
    // Check if optimization is needed
    // This is a simplified example - in a real app, you'd use a job queue
    
    // Generate a new variant
    const variant = MediaVariant.create({
      originalFileId: fileId,
      variantType: 'optimized',
      qualityPercentage: options.quality,
      widthPixels: options.width,
      heightPixels: options.height,
      format: options.format,
      storagePath: `${mediaFile.storagePath}_optimized`,
      createdAt: new Date(),
    });

    // Save variant
    if (this.mediaVariantRepository) {
      await this.mediaVariantRepository.save(variant);
    }
    
    return variant;
  }

  async getUserFiles(userId: string, filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isPublic?: boolean;
  } = {}) {
    const { page = 1, limit = 10, ...rest } = filters;
    return this.mediaFileRepository.findByUserId(userId, page, limit);
  }

  private async scheduleMediaProcessing(fileId: string): Promise<void> {
    // In a real app, this would add a job to a queue
    logger.info(`Scheduling processing for file ${fileId}`);
    
    // Simulate processing
    setTimeout(async () => {
      try {
        const mediaFile = await this.mediaFileRepository.findById(fileId);
        if (mediaFile) {
          mediaFile.markAsProcessed();
          await this.mediaFileRepository.update(mediaFile);
          logger.info(`Processing completed for file ${fileId}`);
        }
      } catch (error) {
        logger.error(`Error processing file ${fileId}:`, error);
      }
    }, 5000);
  }

  private isOwner(mediaFile: MediaFile, userId: string): boolean {
    return mediaFile.uploadedByUserId === userId;
  }

  private getCurrentUserId(): string {
    // In a real app, this would get the user ID from the request context
    throw new Error('Not implemented');
  }
}
