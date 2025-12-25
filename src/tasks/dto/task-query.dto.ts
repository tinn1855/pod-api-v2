import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Scope for filtering tasks
 */
export enum TaskScope {
  ALL = 'all',
  MINE = 'mine',
}

/**
 * DTO for querying tasks
 */
export class TaskQueryDto {
  @ApiPropertyOptional({
    description: 'Filter scope: all or mine (created by me or assigned to me)',
    enum: TaskScope,
    default: TaskScope.ALL,
  })
  @IsOptional()
  @IsEnum(TaskScope)
  scope?: TaskScope = TaskScope.ALL;
}

