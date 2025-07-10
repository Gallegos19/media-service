import { ProcessingJob, ProcessingJobStatus } from '../../../../domain/entities/ProcessingJob';
import { IProcessingJobRepository } from '../../../../domain/repositories/IProcessingJobRepository';
import { prisma } from '../PrismaClient';
import { BasePrismaRepository } from '../BasePrismaRepository';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';
import { PaginatedResult } from '../../../../shared/domain/PaginatedResult';

export class PrismaProcessingJobRepository 
  extends BasePrismaRepository<ProcessingJob, any, 'processingJob'> 
  implements IProcessingJobRepository 
{
  constructor() {
    super(prisma, 'processingJob');
  }

  protected toDomain(raw: any): ProcessingJob {
    return ProcessingJob.create(
      {
        mediaFileId: raw.mediaFileId || undefined,
        jobType: raw.jobType,
        status: raw.status as ProcessingJobStatus,
        parameters: raw.parameters || {},
        progressPercentage: Number(raw.progressPercentage),
        errorMessage: raw.errorMessage || undefined,
        startedAt: raw.startedAt ? new Date(raw.startedAt) : undefined,
        completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
      },
      new UniqueEntityID(raw.id)
    );
  }

  protected toPersistence(job: ProcessingJob): any {
    const props = job as any;
    return {
      id: this.parseId(job.id),
      mediaFileId: props.mediaFileId,
      jobType: props.jobType,
      status: props.status,
      parameters: props.parameters || {},
      progressPercentage: props.progressPercentage,
      errorMessage: props.errorMessage,
      startedAt: props.startedAt,
      completedAt: props.completedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  async findById(id: string): Promise<ProcessingJob | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findUnique({
        where: { id },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findByMediaFileId(mediaFileId: string): Promise<ProcessingJob[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: { mediaFileId },
        orderBy: { createdAt: 'desc' },
      });
      return this.mapToDomainEntities(records);
    });
  }

  async findByStatus(
    status: ProcessingJobStatus, 
    limit: number = 100
  ): Promise<ProcessingJob[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: { status },
        take: limit,
        orderBy: { createdAt: 'asc' },
      });
      return this.mapToDomainEntities(records);
    });
  }

  async save(job: ProcessingJob): Promise<void> {
    await this.executeQuery(async () => {
      const data = this.toPersistence(job);
      await this.getModelClient().upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    });
  }

  async update(job: ProcessingJob): Promise<void> {
    await this.save(job);
  }

  async delete(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      try {
        await this.getModelClient().delete({
          where: { id },
        });
        return true;
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
            return false;
          }
        throw error;
      }
    });
  }

  async findStuckJobs(
    olderThan: Date, 
    statuses: ProcessingJobStatus[]
  ): Promise<ProcessingJob[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: {
          status: { in: statuses },
          updatedAt: { lt: olderThan },
        },
      });
      return this.mapToDomainEntities(records);
    });
  }

  async findByUser(
    userId: string, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<PaginatedResult<ProcessingJob>> {
    return this.executeQuery(async () => {
      const skip = (page - 1) * pageSize;
      
      // First, find all media files for the user
      const mediaFiles = await prisma.mediaFile.findMany({
        where: { uploadedByUserId: userId },
        select: { id: true },
      });
      
      const mediaFileIds = mediaFiles.map((file: { id: string }) => file.id);

      const [total, items] = await Promise.all([
        this.getModelClient().count({
          where: { mediaFileId: { in: mediaFileIds } },
        }),
        this.getModelClient().findMany({
          where: { mediaFileId: { in: mediaFileIds } },
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
}
