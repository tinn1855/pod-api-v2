import { IsEnum, IsUUID, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EntityType } from '@prisma/client';

/**
 * Allowed entity types for comments
 */
const ALLOWED_ENTITY_TYPES = [
  EntityType.BOARD,
  EntityType.TASK,
  EntityType.DESIGN,
  EntityType.CONTENT,
] as const;

/**
 * DTO for querying comments with filters
 */
export class CommentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type. Allowed values: BOARD, TASK, DESIGN, CONTENT',
    enum: EntityType,
    example: EntityType.TASK,
  })
  @IsOptional()
  @IsEnum(ALLOWED_ENTITY_TYPES, {
    message: 'entityType must be one of: BOARD, TASK, DESIGN, CONTENT',
  })
  entityType?: EntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID (UUID). Returns comments for a specific entity.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed). Used for pagination.',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page. Maximum 100.',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;
}

