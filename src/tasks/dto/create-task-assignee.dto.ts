import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskAssigneeType } from '@prisma/client';

/**
 * DTO for creating a task assignee
 */
export class CreateTaskAssigneeDto {
  @ApiProperty({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Assignee type',
    enum: TaskAssigneeType,
    example: TaskAssigneeType.DESIGNER,
  })
  @IsEnum(TaskAssigneeType)
  type: TaskAssigneeType;
}

