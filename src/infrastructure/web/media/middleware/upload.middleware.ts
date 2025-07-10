import multer, { FileFilterCallback, Multer } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { BadRequestException } from '../../../../exceptions/HttpException';
import { MAX_FILE_SIZE, FILE_SIZE_LIMITS } from '../../../../config';

// Configure memory storage
const storage = multer.memoryStorage();

// Helper function to get file type category
const getFileTypeCategory = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'imágenes';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audios';
  if (mimetype === 'application/pdf') return 'documentos PDF';
  return 'archivos';
};

// Helper function to get allowed extensions for UI
const getAllowedExtensions = (): string[] => {
  const extensions = new Set<string>();
  
  Object.keys(FILE_SIZE_LIMITS).forEach(mime => {
    const ext = mime.split('/')[1];
    if (ext) {
      extensions.add(ext.toUpperCase());
    }
  });
  
  return Array.from(extensions).sort();
};

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Get all allowed MIME types from the FILE_SIZE_LIMITS keys
  const allowedMimeTypes = Object.keys(FILE_SIZE_LIMITS);
  
  // Log the incoming file info for debugging
  console.log('File upload attempt:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Log the rejection
    console.log(`Rejected file type: ${file.mimetype}`);
    
    // Get file extension for better error message
    const fileExt = file.originalname.split('.').pop()?.toUpperCase() || 'desconocida';
    const allowedExtensions = getAllowedExtensions();
    
    const errorMessage = `Formato de archivo no soportado (${fileExt}). ` +
      `Por favor, sube ${getFileTypeCategory(file.mimetype)} con los siguientes formatos: ` +
      `${allowedExtensions.join(', ')}.`;
    
    cb(new Error(errorMessage));
  }
};

// Create a function to get the appropriate multer instance based on file type
const createMulterInstance = (mimetype: string) => {
  const fileSizeLimit = FILE_SIZE_LIMITS[mimetype as keyof typeof FILE_SIZE_LIMITS] || MAX_FILE_SIZE;
  
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: fileSizeLimit,
      files: 1, // Limit to 1 file per request
    },
  });
};

// Default multer instance with max file size
const defaultUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// Middleware to handle file uploads with dynamic size limits
const upload: Multer = {
  single: (fieldName: string): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
      const multerInstance = req.headers['content-type']?.includes('multipart/form-data')
        ? createMulterInstance(req.headers['content-type'])
        : defaultUpload;
      
      return multerInstance.single(fieldName)(req, res, next);
    };
  },
  // Add other multer methods as needed
  array: defaultUpload.array.bind(defaultUpload),
  fields: defaultUpload.fields.bind(defaultUpload),
  any: defaultUpload.any.bind(defaultUpload),
  none: defaultUpload.none.bind(defaultUpload),
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Middleware to handle upload errors
export const handleUploadError = (
  err: any,
  req: Request,
  res: any,
  next: any
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const contentType = req.headers['content-type'] || '';
      const fileType = Object.entries(FILE_SIZE_LIMITS).find(([type]) => 
        contentType.includes(type.split('/')[0])
      )?.[0] || 'archivo';
      
      const maxSize = FILE_SIZE_LIMITS[fileType as keyof typeof FILE_SIZE_LIMITS] || MAX_FILE_SIZE;
      
      return next(new BadRequestException(
        `El ${fileType} es demasiado grande. Tamaño máximo permitido: ${formatFileSize(maxSize)}`
      ));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new BadRequestException('Unexpected field in form data'));
    }
  } else if (err) {
    return next(err);
  }
  next();
};

export { upload };
