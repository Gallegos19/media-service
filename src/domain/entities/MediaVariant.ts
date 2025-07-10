 import { Entity } from '../../shared/domain/Entity';
import { UniqueEntityID } from '../../shared/domain/UniqueEntityID';

export interface MediaVariantProps {
  originalFileId: string;
  variantType: string;
  widthPixels?: number;
  heightPixels?: number;
  fileSizeBytes?: number;
  qualityPercentage?: number;
  format?: string;
  storagePath: string;
  publicUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export class MediaVariant extends Entity<MediaVariantProps> {
  private constructor(props: MediaVariantProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: MediaVariantProps, id?: UniqueEntityID): MediaVariant {
    const defaultProps: Partial<MediaVariantProps> = {
      createdAt: new Date(),
    };

    return new MediaVariant({
      ...defaultProps,
      ...props,
    }, id);
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  get originalFileId(): string {
    return this.props.originalFileId;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get variantType(): string {
    return this.props.variantType;
  }

  get storagePath(): string {
    return this.props.storagePath;
  }

  get publicUrl(): string | undefined {
    return this.props.publicUrl;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  get width(): number | undefined {
    return this.props.widthPixels;
  }

  get height(): number | undefined {
    return this.props.heightPixels;
  }

  get quality(): number | undefined {
    return this.props.qualityPercentage;
  }

  get format(): string | undefined {
    return this.props.format;
  }

  updatePublicUrl(url: string): void {
    this.props.publicUrl = url;
  }
}
