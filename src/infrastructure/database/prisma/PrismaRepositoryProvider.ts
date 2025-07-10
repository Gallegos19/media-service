import { IMediaFileRepository } from '../../../domain/repositories/IMediaFileRepository';
import { IMediaVariantRepository } from '../../../domain/repositories/IMediaVariantRepository';
import { IProcessingJobRepository } from '../../../domain/repositories/IProcessingJobRepository';
import { IUploadSessionRepository } from '../../../domain/repositories/IUploadSessionRepository';
import { PrismaMediaFileRepository } from './repositories/PrismaMediaFileRepository';
import { PrismaMediaVariantRepository } from './repositories/PrismaMediaVariantRepository';
import { PrismaProcessingJobRepository } from './repositories/PrismaProcessingJobRepository';
import { PrismaUploadSessionRepository } from './repositories/PrismaUploadSessionRepository';

class PrismaRepositoryProvider {
  private static mediaFileRepository: IMediaFileRepository;
  private static mediaVariantRepository: IMediaVariantRepository;
  private static processingJobRepository: IProcessingJobRepository;
  private static uploadSessionRepository: IUploadSessionRepository;

  static getMediaFileRepository(): IMediaFileRepository {
    if (!this.mediaFileRepository) {
      this.mediaFileRepository = new PrismaMediaFileRepository();
    }
    return this.mediaFileRepository;
  }

  static getMediaVariantRepository(): IMediaVariantRepository {
    if (!this.mediaVariantRepository) {
      this.mediaVariantRepository = new PrismaMediaVariantRepository();
    }
    return this.mediaVariantRepository;
  }

  static getProcessingJobRepository(): IProcessingJobRepository {
    if (!this.processingJobRepository) {
      this.processingJobRepository = new PrismaProcessingJobRepository();
    }
    return this.processingJobRepository;
  }

  static getUploadSessionRepository(): IUploadSessionRepository {
    if (!this.uploadSessionRepository) {
      this.uploadSessionRepository = new PrismaUploadSessionRepository();
    }
    return this.uploadSessionRepository;
  }

  static resetRepositories(): void {
    this.mediaFileRepository = null as any;
    this.mediaVariantRepository = null as any;
    this.processingJobRepository = null as any;
    this.uploadSessionRepository = null as any;
  }
}

export { PrismaRepositoryProvider };

// Export repository instances for convenience
export const mediaFileRepository = PrismaRepositoryProvider.getMediaFileRepository();
export const mediaVariantRepository = PrismaRepositoryProvider.getMediaVariantRepository();
export const processingJobRepository = PrismaRepositoryProvider.getProcessingJobRepository();
export const uploadSessionRepository = PrismaRepositoryProvider.getUploadSessionRepository();
