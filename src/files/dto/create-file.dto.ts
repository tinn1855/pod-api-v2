import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a file metadata record
 * File validation is performed using FileValidationService
 */
export class CreateFileDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'design.psd',
  })
  @IsString()
  @MinLength(1)
  originalName: string;

  @ApiProperty({
    description: 'File extension (e.g., .psd, .jpg, .png)',
    example: '.psd',
  })
  @IsString()
  @Matches(/^\./, { message: 'Extension must start with a dot' })
  extension: string;

  @ApiPropertyOptional({
    description: 'MIME type (optional, validated if provided)',
    example: 'image/vnd.adobe.photoshop',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: 'File size in bytes (as string for BigInt)',
    example: '1048576',
  })
  @IsString()
  @Matches(/^\d+$/, { message: 'Size must be a positive integer as string' })
  size: string; // BigInt as string
}

