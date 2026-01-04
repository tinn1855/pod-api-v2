import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({
    description: 'Board ID',
    example: 'board-uuid',
  })
  @IsString()
  boardId: string;

  @ApiProperty({
    description: 'Shop ID',
    example: 'shop-uuid',
  })
  @IsString()
  shopId: string;

  @ApiPropertyOptional({
    description: 'Account ID (optional)',
    example: 'account-uuid',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Content status',
    enum: ContentStatus,
    default: ContentStatus.NEW,
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description: 'Content title',
    example: 'Product Description',
    minLength: 1,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title must be at least 1 character' })
  @MaxLength(500, { message: 'Title must not exceed 500 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Content description',
    example: 'Detailed product description...',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { platform: 'ETSY', category: 'Handmade' },
  })
  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Tags (JSON array)',
    example: ['handmade', 'vintage', 'gift'],
  })
  @IsOptional()
  @IsObject()
  tags?: string[] | Record<string, unknown>;
}

