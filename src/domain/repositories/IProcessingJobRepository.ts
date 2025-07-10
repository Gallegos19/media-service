import { ProcessingJob, ProcessingJobStatus } from '../entities/ProcessingJob';
import { PaginatedResult } from '../../shared/domain/PaginatedResult';

export interface IProcessingJobRepository {
  findById(id: string): Promise<ProcessingJob | null>;
  findByMediaFileId(mediaFileId: string): Promise<ProcessingJob[]>;
  findByStatus(status: ProcessingJobStatus, limit?: number): Promise<ProcessingJob[]>;
  save(processingJob: ProcessingJob): Promise<void>;
  update(processingJob: ProcessingJob): Promise<void>;
  delete(id: string): Promise<boolean>;
  findStuckJobs(olderThan: Date, statuses: ProcessingJobStatus[]): Promise<ProcessingJob[]>;
  findByUser(userId: string, page: number, pageSize: number): Promise<PaginatedResult<ProcessingJob>>;
}
