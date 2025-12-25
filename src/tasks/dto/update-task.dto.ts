import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MinLength,
  ValidateIf,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskColumn } from '@prisma/client';

/**
 * Position object for drag/drop
 */
export class TaskPositionDto {
  @ApiPropertyOptional({
    description: 'ID of task before this position',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  beforeId?: string;

  @ApiPropertyOptional({
    description: 'ID of task after this position',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  afterId?: string;
}

/**
 * DTO for updating a task
 */
export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task title',
    example: 'Updated task title',
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title must not be empty' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Task description',
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

  @ApiPropertyOptional({
    description: 'Task column (for drag/drop)',
    enum: TaskColumn,
    example: TaskColumn.DONE_IDEA,
  })
  @IsOptional()
  @IsEnum(TaskColumn)
  column?: TaskColumn;

  @ApiPropertyOptional({
    description: 'Position for drag/drop (requires column to be set)',
    type: TaskPositionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskPositionDto)
  @ValidateIf((o) => o.column !== undefined)
  @IsObject()
  position?: TaskPositionDto;
}

