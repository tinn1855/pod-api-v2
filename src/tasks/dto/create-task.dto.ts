import {
  IsString,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a task
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Design product banner',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Title must not be empty' })
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Create banner for product launch',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'High priority',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Design ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  designId?: string;

  @ApiPropertyOptional({
    description: 'Content ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  contentId?: string;
}

