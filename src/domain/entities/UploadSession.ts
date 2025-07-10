import { Entity } from '../../shared/domain/Entity';
import { UniqueEntityID } from '../../shared/domain/UniqueEntityID';

export enum UploadSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ABORTED = 'aborted',
}

export interface UploadSessionProps {
  userId: string;
  sessionToken: string;
  totalChunks: number;
  uploadedChunks: number;
  totalSizeBytes: number;
  currentSizeBytes: number;
  status: UploadSessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UploadSession extends Entity<UploadSessionProps> {
  private constructor(props: UploadSessionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: UploadSessionProps, id?: UniqueEntityID): UploadSession {
    const defaultProps: Partial<UploadSessionProps> = {
      uploadedChunks: 0,
      currentSizeBytes: 0,
      status: UploadSessionStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new UploadSession({
      ...defaultProps,
      ...props,
    }, id);
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get sessionToken(): string {
    return this.props.sessionToken;
  }

  get status(): UploadSessionStatus {
    return this.props.status;
  }

  get isCompleted(): boolean {
    return this.status === UploadSessionStatus.COMPLETED;
  }

  get isActive(): boolean {
    return this.status === UploadSessionStatus.ACTIVE;
  }

  get progress(): number {
    return (this.props.uploadedChunks / this.props.totalChunks) * 100;
  }

  public complete(): void {
    if (this.isCompleted) {
      return;
    }
    
    this.props.status = UploadSessionStatus.COMPLETED;
    this.props.updatedAt = new Date();
  }

  public fail(): void {
    this.props.status = UploadSessionStatus.FAILED;
    this.props.updatedAt = new Date();
  }

  public abort(): void {
    this.props.status = UploadSessionStatus.ABORTED;
    this.props.updatedAt = new Date();
  }

  public addChunk(chunkSize: number): void {
    if (!this.isActive) {
      throw new Error('Cannot add chunk to a non-active upload session');
    }

    this.props.uploadedChunks += 1;
    this.props.currentSizeBytes += chunkSize;
    this.props.updatedAt = new Date();

    if (this.props.uploadedChunks >= this.props.totalChunks) {
      this.complete();
    }
  }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }
}
