import { IStorageService, FileUploadResult } from '@domain/services/IStorageService';
import { cloudinaryStorage } from '../CloudinaryStorage';

export class CloudinaryStorageAdapter implements IStorageService {
  async uploadFile(
    file: Express.Multer.File,
    options: {
      folder?: string;
      public_id?: string;
      resource_type?: 'auto' | 'image' | 'video' | 'raw';
      overwrite?: boolean;
      invalidate?: boolean;
    } = {}
  ): Promise<FileUploadResult> {
    return cloudinaryStorage.uploadFile(file, options);
  }

  async deleteFile(
    publicId: string,
    resource_type: string = 'image',
    invalidate: boolean = true
  ): Promise<boolean> {
    return cloudinaryStorage.deleteFile(publicId, resource_type, invalidate);
  }

  async optimizeImage(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png' | 'gif';
      crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb';
      gravity?: 'face' | 'center' | 'auto';
    } = {}
  ): Promise<string> {
    return cloudinaryStorage.optimizeImage(publicId, options);
  }

  async getResourceInfo(
    publicId: string,
    resourceType: string = 'image'
  ): Promise<any> {
    return cloudinaryStorage.getResourceInfo(publicId, resourceType);
  }

  async createFolder(folderPath: string): Promise<boolean> {
    return cloudinaryStorage.createFolder(folderPath);
  }
  
  async listResources(options: {
    type?: string;
    prefix?: string;
    max_results?: number;
  } = {}): Promise<any[]> {
    return cloudinaryStorage.listResources(options);
  }
}

export const cloudinaryStorageAdapter = new CloudinaryStorageAdapter();
