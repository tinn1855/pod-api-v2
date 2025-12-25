import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for querying folders
 */
export class FolderQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by parent folder ID. If not provided, returns root-level folders',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

