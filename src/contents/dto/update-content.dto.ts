import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, Prisma } from '@prisma/client';

/**
 * DTO for updating content
 */
export class UpdateContentDto {
  @ApiPropertyOptional({
    description: 'Content title',
    example: 'Updated Product Description',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Content description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Shop ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Account ID (UUID). Set to null to remove account association',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  @IsOptional()
  accountId?: string | null;

  @ApiPropertyOptional({
    description: 'Content status (MVP allows free change)',
    enum: ContentStatus,
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

