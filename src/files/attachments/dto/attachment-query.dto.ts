import { IsEnum, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EntityType } from '@prisma/client';

/**
 * DTO for querying attachments with filters
 */
export class AttachmentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: EntityType,
  })
  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}

