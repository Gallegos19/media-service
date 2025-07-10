import { Entity } from '../../shared/domain/Entity';
import { UniqueEntityID } from '../../shared/domain/UniqueEntityID';

export enum MediaCategory {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum VirusScanStatus {
  PENDING = 'pending',
  CLEAN = 'clean',
  INFECTED = 'infected',
  ERROR = 'error',
}

export interface MediaFileProps {
  originalFilename: string;
  fileType: string;
  mediaCategory: MediaCategory;
  mimeType: string;
  fileSizeBytes: number;
  widthPixels?: number;
  heightPixels?: number;
  durationSeconds?: number;
  uploadedByUserId: string;
  uploadPurpose?: string;
  storageProvider: string;
  storagePath: string;
  publicUrl?: string;
  thumbnailUrl?: string;
  isProcessed: boolean;
  isPublic: boolean;
  downloadCount: number;
  virusScanStatus: VirusScanStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export class MediaFile extends Entity<MediaFileProps> {
  private constructor(props: MediaFileProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: MediaFileProps, id?: UniqueEntityID): MediaFile {
    const defaultProps: Partial<MediaFileProps> = {
      storageProvider: 's3',
      isProcessed: false,
      isPublic: false,
      downloadCount: 0,
      virusScanStatus: VirusScanStatus.PENDING,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new MediaFile({
      ...defaultProps,
      ...props,
    }, id);
  }

  // Getters
  get id(): UniqueEntityID {
    return this._id;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get fileType(): string {
    return this.props.fileType;
  }

  get mediaCategory(): MediaCategory {
    return this.props.mediaCategory;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get fileSizeBytes(): number {
    return this.props.fileSizeBytes;
  }

  get publicUrl(): string | undefined {
    return this.props.publicUrl;
  }

  get isPublic(): boolean {
    return this.props.isPublic;
  }

  get uploadedByUserId(): string {
    return this.props.uploadedByUserId;
  }

  get isProcessed(): boolean {
    return this.props.isProcessed;
  }

  get virusScanStatus(): VirusScanStatus {
    return this.props.virusScanStatus;
  }

  get downloadCount(): number {
    return this.props.downloadCount;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get storagePath(): string {
    return this.props.storagePath;
  }

  // Setters for properties that can be updated
  public markAsProcessed(thumbnailUrl?: string): void {
    this.props.isProcessed = true;
    this.props.updatedAt = new Date();
    if (thumbnailUrl) {
      this.props.thumbnailUrl = thumbnailUrl;
    }
  }

  public updateVirusScanStatus(status: VirusScanStatus): void {
    this.props.virusScanStatus = status;
    this.props.updatedAt = new Date();
  }

  public incrementDownloadCount(): void {
    this.props.downloadCount += 1;
    this.props.updatedAt = new Date();
  }

  public updatePublicUrl(url: string): void {
    this.props.publicUrl = url;
    this.props.updatedAt = new Date();
  }
}
