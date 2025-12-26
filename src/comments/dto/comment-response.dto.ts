import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';

export class CommentResponseDto {
  @ApiProperty({
    description: 'Comment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  orgId: string;

  @ApiProperty({
    description: 'Type of entity this comment is attached to',
    enum: EntityType,
    example: EntityType.TASK,
  })
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity this comment is attached to',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  entityId: string;

  @ApiProperty({
    description: 'Comment body/text content',
    example: 'This looks great! Please review the design.',
  })
  body: string;

  @ApiProperty({
    description: 'ID of the user who created the comment',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  createdById: string;

  @ApiProperty({
    description: 'User who created the comment',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174003',
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
  })
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Comment creation timestamp',
    example: '2025-12-14T15:32:54.370Z',
  })
  createdAt: Date;
}

export class CommentListResponseDto {
  @ApiProperty({
    description: 'Array of comments',
    type: [CommentResponseDto],
  })
  data: CommentResponseDto[];

  @ApiProperty({
    description: 'Total number of comments matching the filters',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}

