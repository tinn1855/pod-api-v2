import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a board
 */
export class UpdateBoardDto {
  @ApiPropertyOptional({
    description: 'Board title',
    example: 'Q1 Product Design Updated',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title must not be empty' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Board description',
    example: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Updated notes',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Shop ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({
    description: 'Assignee designer ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  assigneeDesignerId?: string;

  @ApiPropertyOptional({
    description: 'Due date (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Priority (1-10)',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

