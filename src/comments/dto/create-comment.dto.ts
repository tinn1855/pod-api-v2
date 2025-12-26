import { IsEnum, IsUUID, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
 * DTO for creating a comment
 */
export class CreateCommentDto {
  @ApiProperty({
    description:
      'Type of entity this comment is attached to. Allowed values: BOARD, TASK, DESIGN, CONTENT',
    enum: EntityType,
    example: EntityType.TASK,
  })
  @IsEnum(ALLOWED_ENTITY_TYPES, {
    message: 'entityType must be one of: BOARD, TASK, DESIGN, CONTENT',
  })
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity this comment is attached to (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  entityId: string;

  @ApiProperty({
    description: 'Comment body/text content. Must not be empty.',
    example: 'This looks great! Please review the design.',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  body: string;
}
