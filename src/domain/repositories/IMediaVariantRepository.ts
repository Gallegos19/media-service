import { MediaVariant } from '../entities/MediaVariant';

export interface IMediaVariantRepository {
  findById(id: string): Promise<MediaVariant | null>;
  findByOriginalFileId(originalFileId: string): Promise<MediaVariant[]>;
  save(mediaVariant: MediaVariant): Promise<MediaVariant>;
  delete(id: string): Promise<boolean>;
  deleteByOriginalFileId(originalFileId: string): Promise<number>;
  exists(id: string): Promise<boolean>;
  findByVariantType(originalFileId: string, variantType: string): Promise<MediaVariant | null>;
}
