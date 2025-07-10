import { MediaCategory } from '../../../../domain/entities/MediaFile';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMediaDto {
  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  size?: number;

  @IsOptional()
  @IsEnum(MediaCategory, {
    message: `category debe ser uno de: ${Object.values(MediaCategory).join(', ')}`
  })
  category?: MediaCategory;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  uploadPurpose?: string;
}

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isPublic?: boolean;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class OptimizeMediaDto {
  @IsString({
    message: 'mediaId es requerido'
  })
  mediaId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number = 80;

  @IsOptional()
  @IsInt()
  @Min(100)
  maxWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  maxHeight?: number;

  @IsOptional()
  @IsString()
  format?: 'jpeg' | 'png' | 'webp';
}

export class CreateVariantDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  crop?: string;

  @IsOptional()
  @IsString()
  gravity?: string;

  @IsOptional()
  @IsString()
  variantName?: string;
}

export class GetUserFilesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MediaCategory)
  category?: MediaCategory;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: string }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isPublic?: boolean;
}