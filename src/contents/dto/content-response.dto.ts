import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class ContentResponseDto {
  @ApiProperty({ description: 'Content ID', example: 'content-uuid' })
  id: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-uuid' })
  orgId: string;

  @ApiProperty({ description: 'Board ID', example: 'board-uuid' })
  boardId: string;

  @ApiProperty({ description: 'Shop ID', example: 'shop-uuid' })
  shopId: string;

  @ApiPropertyOptional({
    description: 'Account ID',
    example: 'account-uuid',
  })
  accountId?: string | null;

  @ApiProperty({
    description: 'Content status',
    enum: ContentStatus,
    example: ContentStatus.NEW,
  })
  status: ContentStatus;

  @ApiPropertyOptional({
    description: 'Content title',
    example: 'Product Description',
  })
  title?: string | null;

  @ApiPropertyOptional({
    description: 'Content description',
    example: 'Detailed product description...',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { platform: 'ETSY', category: 'Handmade' },
  })
  meta?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Tags (JSON)',
    example: ['handmade', 'vintage', 'gift'],
  })
  tags?: string[] | Record<string, unknown> | null;

  @ApiProperty({ description: 'Created by user ID', example: 'user-uuid' })
  createdById: string;

  @ApiPropertyOptional({
    description: 'Deleted timestamp (soft delete)',
    example: null,
  })
  deletedAt?: Date | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ContentListResponseDto {
  @ApiProperty({ type: [ContentResponseDto] })
  data: ContentResponseDto[];

  @ApiProperty({ description: 'Total count', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;
}

