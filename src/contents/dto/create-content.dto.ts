import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

/**
 * DTO for creating content
 */
export class CreateContentDto {
  @ApiPropertyOptional({
    description: 'Content title',
    example: 'Product Description',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Content description',
    example: 'Detailed product description for listing',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Shop ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  shopId: string;

  @ApiPropertyOptional({
    description: 'Account ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
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
    description: 'Metadata (JSON object)',
    example: { tags: ['product', 'description'] },
  })
  @IsOptional()
  meta?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Tags (JSON array)',
    example: ['product', 'description', 'seo'],
  })
  @IsOptional()
  tags?: unknown[];
}

