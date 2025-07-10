import { MediaVariant } from '../../../../domain/entities/MediaVariant';
import { IMediaVariantRepository } from '../../../../domain/repositories/IMediaVariantRepository';
import { prisma } from '../PrismaClient';
import { BasePrismaRepository } from '../BasePrismaRepository';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

export class PrismaMediaVariantRepository 
  extends BasePrismaRepository<MediaVariant, any, 'mediaVariant'> 
  implements IMediaVariantRepository 
{
  constructor() {
    super(prisma, 'mediaVariant');
  }

  protected toDomain(raw: any): MediaVariant {
    return MediaVariant.create(
      {
        originalFileId: raw.originalFileId,
        variantType: raw.variantType,
        widthPixels: raw.widthPixels ? Number(raw.widthPixels) : undefined,
        heightPixels: raw.heightPixels ? Number(raw.heightPixels) : undefined,
        fileSizeBytes: raw.fileSizeBytes ? Number(raw.fileSizeBytes) : undefined,
        qualityPercentage: raw.qualityPercentage ? Number(raw.qualityPercentage) : undefined,
        format: raw.format || undefined,
        storagePath: raw.storagePath,
        publicUrl: raw.publicUrl || undefined,
        createdAt: new Date(raw.createdAt),
      },
      new UniqueEntityID(raw.id)
    );
  }

  protected toPersistence(variant: MediaVariant): any {
    const props = variant as any;
    return {
      id: this.parseId(variant.id),
      originalFileId: props.originalFileId,
      variantType: props.variantType,
      widthPixels: props.widthPixels,
      heightPixels: props.heightPixels,
      fileSizeBytes: props.fileSizeBytes,
      qualityPercentage: props.qualityPercentage,
      format: props.format,
      storagePath: props.storagePath,
      publicUrl: props.publicUrl,
      createdAt: props.createdAt,
    };
  }

  async findById(id: string): Promise<MediaVariant | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findUnique({
        where: { id },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findByOriginalFileId(originalFileId: string): Promise<MediaVariant[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: { originalFileId },
      });
      return this.mapToDomainEntities(records);
    });
  }

  async save(variant: MediaVariant): Promise<MediaVariant> {
    return this.executeQuery(async () => {
      const data = this.toPersistence(variant);
      const result = await this.getModelClient().upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
      return this.toDomain(result);
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

  async deleteByOriginalFileId(originalFileId: string): Promise<number> {
    return this.executeQuery(async () => {
      const result = await this.getModelClient().deleteMany({
        where: { originalFileId },
      });
      return result.count;
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

  async findByVariantType(
    originalFileId: string, 
    variantType: string
  ): Promise<MediaVariant | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findFirst({
        where: { 
          originalFileId,
          variantType,
        },
      });
      return record ? this.toDomain(record) : null;
    });
  }
}
