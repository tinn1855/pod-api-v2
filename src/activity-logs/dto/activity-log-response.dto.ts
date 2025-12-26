import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';

export class ActivityLogResponseDto {
  @ApiProperty({
    description: 'Activity log ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  orgId: string;

  @ApiProperty({
    description: 'Actor (user) ID who performed the action',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  actorId: string;

  @ApiProperty({
    description: 'Actor (user) information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
  })
  actor: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Action name',
    example: 'comment.create',
  })
  action: string;

  @ApiProperty({
    description: 'Type of entity affected',
    enum: EntityType,
    example: EntityType.TASK,
  })
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity affected',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  entityId: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON object)',
    example: { commentId: '123e4567-e89b-12d3-a456-426614174004' },
    nullable: true,
  })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Timestamp when the action was performed',
    example: '2025-12-14T15:32:54.370Z',
  })
  createdAt: Date;
}

export class ActivityLogListResponseDto {
  @ApiProperty({
    description: 'Array of activity logs',
    type: [ActivityLogResponseDto],
  })
  items: ActivityLogResponseDto[];

  @ApiPropertyOptional({
    description: 'Cursor for next page (base64 encoded JSON). Null if no more items.',
    example: 'eyJjcmVhdGVkQXQiOiIyMDI1LTEyLTE0VDE1OjMyOjU0LjM3MFoiLCJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCJ9',
    nullable: true,
  })
  nextCursor: string | null;
}

