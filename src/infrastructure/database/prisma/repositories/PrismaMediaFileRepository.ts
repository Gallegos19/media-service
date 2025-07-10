import { MediaFile, MediaCategory, VirusScanStatus } from '@domain/entities/MediaFile';
import { IMediaFileRepository } from '@domain/repositories/IMediaFileRepository';
import { PaginatedResult } from '@shared/domain/PaginatedResult';
import { prisma } from '../PrismaClient';
import { BasePrismaRepository } from '../BasePrismaRepository';
import { UniqueEntityID } from '@shared/domain/UniqueEntityID';

// Import the Prisma generated types
import { MediaFile as PrismaMediaFile } from '@prisma/client';

export class PrismaMediaFileRepository 
  extends BasePrismaRepository<MediaFile, PrismaMediaFile, 'mediaFile'>
  implements IMediaFileRepository 
{
  constructor() {
    super(prisma, 'mediaFile');
  }

  protected toDomain(raw: any): MediaFile {
    return MediaFile.create(
      {
        originalFilename: raw.originalFilename,
        fileType: raw.fileType,
        mediaCategory: raw.mediaCategory as MediaCategory,
        mimeType: raw.mimeType,
        fileSizeBytes: Number(raw.fileSizeBytes),
        widthPixels: raw.widthPixels ? Number(raw.widthPixels) : undefined,
        heightPixels: raw.heightPixels ? Number(raw.heightPixels) : undefined,
        durationSeconds: raw.durationSeconds ? Number(raw.durationSeconds) : undefined,
        uploadedByUserId: raw.uploadedByUserId,
        uploadPurpose: raw.uploadPurpose,
        storageProvider: raw.storageProvider,
        storagePath: raw.storagePath,
        publicUrl: raw.publicUrl || undefined,
        thumbnailUrl: raw.thumbnailUrl || undefined,
        isProcessed: raw.isProcessed,
        isPublic: raw.isPublic,
        downloadCount: raw.downloadCount,
        virusScanStatus: raw.virusScanStatus as VirusScanStatus,
        metadata: raw.metadata || {},
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
        deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : undefined,
        createdBy: raw.createdBy || undefined,
        updatedBy: raw.updatedBy || undefined,
      },
      new UniqueEntityID(raw.id)
    );
  }

  protected toPersistence(mediaFile: MediaFile): any {
    const props = mediaFile as any;
    return {
      id: this.parseId(mediaFile.id),
      originalFilename: props.originalFilename,
      fileType: props.fileType,
      mediaCategory: props.mediaCategory,
      mimeType: props.mimeType,
      fileSizeBytes: props.fileSizeBytes,
      widthPixels: props.widthPixels,
      heightPixels: props.heightPixels,
      durationSeconds: props.durationSeconds,
      uploadedByUserId: props.uploadedByUserId,
      uploadPurpose: props.uploadPurpose,
      storageProvider: props.storageProvider,
      storagePath: props.storagePath,
      publicUrl: props.publicUrl,
      thumbnailUrl: props.thumbnailUrl,
      isProcessed: props.isProcessed,
      isPublic: props.isPublic,
      downloadCount: props.downloadCount,
      virusScanStatus: props.virusScanStatus,
      metadata: props.metadata || {},
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      deletedAt: props.deletedAt,
      createdBy: props.createdBy,
      updatedBy: props.updatedBy,
    };
  }

  async findById(id: string): Promise<MediaFile | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findUnique({
        where: { id },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findByUserId(
    userId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<PaginatedResult<MediaFile>> {
    return this.executeQuery(async () => {
      const skip = (page - 1) * pageSize;
      const [total, items] = await Promise.all([
        this.getModelClient().count({ where: { uploadedByUserId: userId } }),
        this.getModelClient().findMany({
          where: { uploadedByUserId: userId },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return this.createPaginationResult(
        this.mapToDomainEntities(items),
        total,
        page,
        pageSize
      );
    });
  }

  async save(mediaFile: MediaFile): Promise<void> {
    await this.executeQuery(async () => {
      const data = this.toPersistence(mediaFile);
      
      // Extract the string ID from the ID object if it exists
      const extractId = (id: any): string => {
        if (id === null || id === undefined) {
          throw new Error('ID cannot be null or undefined');
        }
        return typeof id === 'object' && 'value' in id ? id.value : String(id);
      };
      
      const id = extractId(data.id);
      
      // Create a new data object with the ID properly formatted
      const cleanData = {
        ...data,
        id: extractId(data.id)
      };
      
      // Remove any undefined values that might cause Prisma validation errors
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      await this.getModelClient().upsert({
        where: { id },
        create: cleanData,
        update: cleanData,
      });
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      try {
        await this.getModelClient().delete({
          where: { id },
        });
        return true;
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'P2025') { 
          return false;
        }
        throw error;
      }
    });
  }

  async exists(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const count = await this.getModelClient().count({
        where: { id },
      });
      return count > 0;
    });
  }

  async update(mediaFile: MediaFile): Promise<void> {
    await this.save(mediaFile);
  }

  async findByPublicUrl(publicUrl: string): Promise<MediaFile | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findFirst({
        where: { publicUrl },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findByStoragePath(storagePath: string): Promise<MediaFile | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findFirst({
        where: { storagePath },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findExpiredTemporaryFiles(expirationDate: Date): Promise<MediaFile[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: {
          uploadPurpose: 'temporary',
          createdAt: { lt: expirationDate },
        },
      });
      return this.mapToDomainEntities(records);
    });
  }

  async markAsDeleted(id: string, deletedBy: string): Promise<void> {
    await this.executeQuery(async () => {
      await this.getModelClient().update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: deletedBy,
        },
      });
    });
  }

  async findByCategory(category: string): Promise<MediaFile[]> {
    return this.executeQuery(async () => {
      const files = await this.getModelClient().findMany({
        where: {
          mediaCategory: category,
          deletedAt: null, // No incluir archivos eliminados
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return files.map((file: any) => this.toDomain(file));
    });
  }

  async findByFilters(filters: {
    uploadedByUserId?: string;
    category?: string;
    isPublic?: boolean;
  }): Promise<MediaFile[]> {
    const where: any = {
      deletedAt: null, // Only non-deleted files
    };

    // Only add uploadedByUserId to the query if it's provided
    if (filters.uploadedByUserId) {
      where.uploadedByUserId = filters.uploadedByUserId;
    }

    if (filters.category) {
      where.mediaCategory = filters.category; // Map category to mediaCategory for database query
    }

    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    const files = await this.prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return files.map(file => this.toDomain(file));
  }
}
