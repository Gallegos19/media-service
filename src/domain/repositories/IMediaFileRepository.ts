import { MediaFile } from '../entities/MediaFile';
import { PaginatedResult } from '@shared/domain/PaginatedResult';

export interface IMediaFileRepository {
  findById(id: string): Promise<MediaFile | null>;
  findByUserId(userId: string, page: number, pageSize: number): Promise<PaginatedResult<MediaFile>>;
  save(mediaFile: MediaFile): Promise<void>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  update(mediaFile: MediaFile): Promise<void>;
  findByPublicUrl(publicUrl: string): Promise<MediaFile | null>;
  findByStoragePath(storagePath: string): Promise<MediaFile | null>;
  findExpiredTemporaryFiles(expirationDate: Date): Promise<MediaFile[]>;
  markAsDeleted(id: string, deletedBy: string): Promise<void>;
  findByFilters(filters: {
    uploadedByUserId?: string;
    category?: string;
    isPublic?: boolean;
  }): Promise<MediaFile[]>;
  
  /**
   * Busca archivos por categoría
   * @param category Categoría de los archivos a buscar
   * @returns Promesa con la lista de archivos de la categoría especificada
   */
  findByCategory(category: string): Promise<MediaFile[]>;
}
