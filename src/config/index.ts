import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Logging
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const LOG_FORMAT = process.env.LOG_FORMAT || 'dev';

// CORS
export const ORIGIN = process.env.ORIGIN || '*';
export const CREDENTIALS = process.env.CREDENTIALS === 'true';

// JWT
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Database
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/media_db?schema=public';

// Cloudinary Configuration
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
export const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'media-service';

// S3 Configuration
export const S3_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'media-service-bucket',
  bucketName: process.env.AWS_S3_BUCKET || 'media-service-bucket', // Alias for compatibility
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  sslEnabled: process.env.AWS_S3_SSL_ENABLED !== 'false',
  signatureVersion: 'v4'
} as const;

// File Uploads
export const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : 50 * 1024 * 1024; // 50MB default

// Specific file size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  // Images
  'image/jpeg': 10 * 1024 * 1024, // 10MB
  'image/png': 10 * 1024 * 1024,  // 10MB
  'image/gif': 20 * 1024 * 1024,  // 20MB
  'image/webp': 10 * 1024 * 1024, // 10MB
  
  // Documents
  'application/pdf': 20 * 1024 * 1024, // 20MB
  
  // Videos
  'video/mp4': 200 * 1024 * 1024, // 200MB
  'video/quicktime': 200 * 1024 * 1024, // 200MB
  'video/x-msvideo': 200 * 1024 * 1024, // .avi
  'video/x-ms-wmv': 200 * 1024 * 1024,  // .wmv
  'video/x-matroska': 200 * 1024 * 1024, // .mkv
  'video/webm': 200 * 1024 * 1024,      // .webm
  'video/3gpp': 200 * 1024 * 1024,      // .3gp
  'video/mpeg': 200 * 1024 * 1024,      // .mpeg
  
  // Audio
  'audio/mpeg': 50 * 1024 * 1024, // 50MB
  'audio/wav': 100 * 1024 * 1024, // 100MB
  'audio/ogg': 100 * 1024 * 1024, // 100MB
  'audio/webm': 100 * 1024 * 1024, // 100MB
  'audio/x-m4a': 100 * 1024 * 1024, // 100MB
};

export const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES 
  ? process.env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
  : Object.keys(FILE_SIZE_LIMITS);

// Default upload directory in the project root
const DEFAULT_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

export const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR) 
  : DEFAULT_UPLOAD_DIR;

// API Documentation
export const API_DOCS_PATH = process.env.API_DOCS_PATH || '/api-docs';

// Validation
export const VALIDATION_OPTIONS = {
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

// Rate Limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100; // Limit each IP to 100 requests per windowMs

// Socket.IO
export const SOCKET_PING_TIMEOUT = 10000;
export const SOCKET_PING_INTERVAL = 25000;

// File Processing
export const MAX_CONCURRENT_JOBS = process.env.MAX_CONCURRENT_JOBS 
  ? parseInt(process.env.MAX_CONCURRENT_JOBS, 10) 
  : 5;

export const JOB_RETRY_ATTEMPTS = process.env.JOB_RETRY_ATTEMPTS
  ? parseInt(process.env.JOB_RETRY_ATTEMPTS, 10)
  : 3;

export const JOB_RETRY_DELAY = process.env.JOB_RETRY_DELAY
  ? parseInt(process.env.JOB_RETRY_DELAY, 10)
  : 5000; // 5 seconds
