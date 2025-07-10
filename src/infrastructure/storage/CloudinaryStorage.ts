import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_API_KEY, 
  CLOUDINARY_API_SECRET, 
  CLOUDINARY_FOLDER 
} from '../../config';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

type UploadOptions = {
  folder?: string;
  public_id?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  overwrite?: boolean;
  invalidate?: boolean;
};

type UploadResult = {
  url: string;
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
};

export class CloudinaryStorage {
  private static instance: CloudinaryStorage;

  private constructor() {}

  public static getInstance(): CloudinaryStorage {
    if (!CloudinaryStorage.instance) {
      CloudinaryStorage.instance = new CloudinaryStorage();
    }
    return CloudinaryStorage.instance;
  }

  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const folder = options.folder || CLOUDINARY_FOLDER;
    const resource_type = options.resource_type || 'auto';

    console.log('Iniciando carga de archivo a Cloudinary:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      folder,
      resource_type,
      options
    });

    // Verificar que el buffer del archivo no esté vacío
    if (!file.buffer || file.buffer.length === 0) {
      console.error('Error: El buffer del archivo está vacío');
      throw new Error('El archivo está vacío o no se pudo leer correctamente');
    }

    try {
      // Verificar que las credenciales de Cloudinary estén configuradas
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        const errorMsg = 'Error: Credenciales de Cloudinary no configuradas correctamente';
        console.error(errorMsg, {
          hasCloudName: !!CLOUDINARY_CLOUD_NAME,
          hasApiKey: !!CLOUDINARY_API_KEY,
          hasApiSecret: !!CLOUDINARY_API_SECRET
        });
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error al verificar credenciales de Cloudinary:', error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type,
          public_id: options.public_id,
          overwrite: options.overwrite,
          invalidate: options.invalidate,
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error('No se pudo cargar el archivo a Cloudinary'));
          }
          
          resolve({
            url: result.url,
            public_id: result.public_id,
            secure_url: result.secure_url,
            format: result.format || '',
            resource_type: result.resource_type || '',
            bytes: result.bytes || 0,
            width: result.width,
            height: result.height,
          });
        }
      );

      // Crear un stream desde el buffer del archivo
      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteFile(
    publicId: string, 
    resource_type: string = 'image',
    invalidate: boolean = true
  ): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resource_type as any,
        invalidate
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Error al eliminar archivo de Cloudinary:', error);
      return false;
    }
  }

  async optimizeImage(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png' | 'gif';
    crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb';
    gravity?: 'face' | 'center' | 'auto';
  } = {}): Promise<string> {
    const transformations = [];

    if (options.width || options.height) {
      const crop = options.crop || 'fill';
      const gravity = options.gravity || 'auto';
      transformations.push(`${crop},w_${options.width || 'auto'},h_${options.height || 'auto'},c_${crop},g_${gravity}`);
    }

    if (options.quality) {
      transformations.push(`q_${options.quality}`);
    }

    if (options.format) {
      transformations.push(`f_${options.format}`);
    }

    return cloudinary.url(publicId, {
      transformation: transformations.length > 0 ? [{ raw_transformation: transformations.join(',') }] : undefined,
      secure: true,
    });
  }

  async getResourceInfo(publicId: string, resourceType: string = 'image') {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType as any,
      });
      return result;
    } catch (error) {
      console.error('Error al obtener información del recurso:', error);
      return null;
    }
  }

  async createFolder(folderPath: string) {
    try {
      await cloudinary.api.create_folder(folderPath);
      return true;
    } catch (error: any) {
      // Si la carpeta ya existe, no es un error
      if (error.error?.http_code === 400 && error.error?.message.includes('already exists')) {
        return true;
      }
      console.error('Error al crear carpeta en Cloudinary:', error);
      return false;
    }
  }

  async listResources(options: {
    type?: string;
    prefix?: string;
    max_results?: number;
  } = {}) {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload' as any,
        prefix: options.prefix,
        max_results: options.max_results || 10,
        ...options,
      });
      return result.resources;
    } catch (error) {
      console.error('Error al listar recursos de Cloudinary:', error);
      return [];
    }
  }
}

export const cloudinaryStorage = CloudinaryStorage.getInstance();
