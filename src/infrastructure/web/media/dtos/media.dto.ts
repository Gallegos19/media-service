import { MediaCategory } from '../../../../domain/entities/MediaFile';
import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator';

export class CreateMediaDto {
  @IsString()
  originalName?: string;

  @IsString()
  mimeType?: string;

  @IsInt()
  @Min(0)
  size?: number;

  @IsEnum(MediaCategory)
  category?: MediaCategory;

  @IsOptional()
  @IsBoolean()
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
  isPublic?: boolean;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

export class OptimizeMediaDto {
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
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

export class GetUserFilesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MediaCategory)
  category?: MediaCategory;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
