import { UploadSession, UploadSessionStatus } from '../../../../domain/entities/UploadSession';
import { IUploadSessionRepository } from '../../../../domain/repositories/IUploadSessionRepository';
import { prisma } from '../PrismaClient';
import { BasePrismaRepository } from '../BasePrismaRepository';
import { UniqueEntityID } from '../../../../shared/domain/UniqueEntityID';

export class PrismaUploadSessionRepository 
  extends BasePrismaRepository<UploadSession, any, 'uploadSession'> 
  implements IUploadSessionRepository 
{
  constructor() {
    super(prisma, 'uploadSession');
  }

  protected toDomain(raw: any): UploadSession {
    return UploadSession.create(
      {
        userId: raw.userId,
        sessionToken: raw.sessionToken,
        totalChunks: Number(raw.totalChunks),
        uploadedChunks: Number(raw.uploadedChunks),
        totalSizeBytes: Number(raw.totalSizeBytes),
        currentSizeBytes: Number(raw.currentSizeBytes),
        status: raw.status as UploadSessionStatus,
        expiresAt: new Date(raw.expiresAt),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
      },
      new UniqueEntityID(raw.id)
    );
  }

  protected toPersistence(session: UploadSession): any {
    const props = session as any;
    return {
      id: this.parseId(session.id),
      userId: props.userId,
      sessionToken: props.sessionToken,
      totalChunks: props.totalChunks,
      uploadedChunks: props.uploadedChunks,
      totalSizeBytes: props.totalSizeBytes,
      currentSizeBytes: props.currentSizeBytes,
      status: props.status,
      expiresAt: props.expiresAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  async findById(id: string): Promise<UploadSession | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findUnique({
        where: { id },
        include: {
          chunks: true,
        },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async findByToken(token: string): Promise<UploadSession | null> {
    return this.executeQuery(async () => {
      const record = await this.getModelClient().findFirst({
        where: { sessionToken: token },
        include: {
          chunks: true,
        },
      });
      return record ? this.toDomain(record) : null;
    });
  }

  async save(session: UploadSession): Promise<void> {
    await this.executeQuery(async () => {
      const data = this.toPersistence(session);
      await this.getModelClient().upsert({
        where: { id: data.id },
        create: data,
        update: data,
      });
    });
  }

  async update(session: UploadSession): Promise<void> {
    await this.save(session);
  }

  async delete(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      try {
        await this.getModelClient().delete({
          where: { id },
        });
        return true;
      } catch (error: unknown) {
        // Check if it's a Prisma error with a code property
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') { // Record not found
          return false;
        }
        throw error;
      }
    });
  }

  async deleteExpiredSessions(expirationDate: Date): Promise<number> {
    return this.executeQuery(async () => {
      const result = await this.getModelClient().deleteMany({
        where: {
          expiresAt: { lt: expirationDate },
          status: { not: 'completed' },
        },
      });
      return result.count;
    });
  }

  async findByUserId(userId: string): Promise<UploadSession[]> {
    return this.executeQuery(async () => {
      const records = await this.getModelClient().findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      return this.mapToDomainEntities(records);
    });
  }
}
