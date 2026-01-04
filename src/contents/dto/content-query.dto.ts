import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContentStatus } from '@prisma/client';

export class ContentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by board ID',
    example: 'board-uuid',
  })
  @IsOptional()
  @IsString()
  boardId?: string;

  @ApiPropertyOptional({
    description: 'Filter by shop ID',
    example: 'shop-uuid',
  })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ContentStatus,
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

