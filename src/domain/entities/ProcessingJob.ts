import { Entity } from '../../shared/domain/Entity';
import { UniqueEntityID } from '../../shared/domain/UniqueEntityID';

export enum ProcessingJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ProcessingJobProps {
  mediaFileId?: string;
  jobType: string;
  status: ProcessingJobStatus;
  parameters: Record<string, any>;
  progressPercentage: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ProcessingJob extends Entity<ProcessingJobProps> {
  private constructor(props: ProcessingJobProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: ProcessingJobProps, id?: UniqueEntityID): ProcessingJob {
    const defaultProps: Partial<ProcessingJobProps> = {
      status: ProcessingJobStatus.PENDING,
      parameters: {},
      progressPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new ProcessingJob({
      ...defaultProps,
      ...props,
    }, id);
  }


  get mediaFileId(): string | undefined {
    return this.props.mediaFileId;
  }

  get jobType(): string {
    return this.props.jobType;
  }

  get status(): ProcessingJobStatus {
    return this.props.status;
  }

  get isCompleted(): boolean {
    return this.status === ProcessingJobStatus.COMPLETED || this.status === ProcessingJobStatus.FAILED;
  }

  public start(): void {
    if (this.props.status !== ProcessingJobStatus.PENDING) {
      throw new Error('Only pending jobs can be started');
    }

    this.props.status = ProcessingJobStatus.PROCESSING;
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    if (this.status === ProcessingJobStatus.COMPLETED) {
      return;
    }

    this.props.status = ProcessingJobStatus.COMPLETED;
    this.props.progressPercentage = 100;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public fail(error: Error): void {
    this.props.status = ProcessingJobStatus.FAILED;
    this.props.errorMessage = error.message;
    this.props.completedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public updateProgress(percentage: number): void {
    if (this.isCompleted) {
      return;
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Progress percentage must be between 0 and 100');
    }

    this.props.progressPercentage = percentage;
    this.props.updatedAt = new Date();
  }

  public updateParameters(parameters: Record<string, any>): void {
    if (this.isCompleted) {
      return;
    }

    this.props.parameters = {
      ...this.props.parameters,
      ...parameters,
    };
    this.props.updatedAt = new Date();
  }
}
