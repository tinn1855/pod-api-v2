import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a file metadata record
 * Used for marking upload complete, updating storageKey, checksum, etc.
 */
export class UpdateFileDto {
  @ApiPropertyOptional({
    description: 'Storage key (S3 key, blob path, etc.) - set when upload is complete',
    example: 'files/abc123/design.psd',
  })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({
    description: 'File checksum/hash (MD5, SHA256, etc.)',
    example: 'd41d8cd98f00b204e9800998ecf8427e',
  })
  @IsOptional()
  @IsString()
  checksum?: string;
}

