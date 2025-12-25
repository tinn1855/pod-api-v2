import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskColumn } from '@prisma/client';

export class TaskAssigneeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  user: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty()
  type: string;

  @ApiProperty()
  createdAt: Date;
}

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orgId: string;

  @ApiProperty()
  boardId: string;

  @ApiProperty({ enum: TaskColumn })
  column: TaskColumn;

  @ApiProperty()
  positionKey: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ nullable: true })
  designId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  contentId?: string | null;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdBy: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional({ type: [TaskAssigneeResponseDto] })
  assignees?: TaskAssigneeResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TaskGroupedResponseDto {
  @ApiProperty({ enum: TaskColumn })
  column: TaskColumn;

  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskGroupedResponseDto] })
  data: TaskGroupedResponseDto[];
}

