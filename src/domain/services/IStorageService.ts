import { Readable } from 'stream';

export interface FileUploadResult {
  url: string;
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface IStorageService {
  uploadFile(
    file: Express.Multer.File,
    options?: {
      folder?: string;
      public_id?: string;
      resource_type?: 'auto' | 'image' | 'video' | 'raw';
      overwrite?: boolean;
      invalidate?: boolean;
    }
  ): Promise<FileUploadResult>;

  deleteFile(
    publicId: string,
    resource_type?: string,
    invalidate?: boolean
  ): Promise<boolean>;

  optimizeImage(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png' | 'gif';
      crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb';
      gravity?: 'face' | 'center' | 'auto';
    }
  ): Promise<string>;

  getResourceInfo(
    publicId: string,
    resourceType?: string
  ): Promise<any>;

  createFolder(folderPath: string): Promise<boolean>;
  
  listResources(options?: {
    type?: string;
    prefix?: string;
    max_results?: number;
  }): Promise<any[]>;
}
