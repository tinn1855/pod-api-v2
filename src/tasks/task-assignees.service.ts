import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateTaskAssigneeDto } from './dto/create-task-assignee.dto';
import { TaskAssigneeResponseDto } from './dto/task-response.dto';
import { EntityType } from '@prisma/client';

@Injectable()
export class TaskAssigneesService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    taskId: string,
    createDto: CreateTaskAssigneeDto,
    userId: string,
    orgId: string,
  ): Promise<TaskAssigneeResponseDto> {
    // Validate task exists and belongs to org
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.orgId !== orgId || task.deletedAt !== null) {
      throw new NotFoundException('Task not found');
    }

    // Validate user exists and belongs to org
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId },
    });

    if (!user || user.orgId !== orgId || user.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    // Check if assignment already exists
    const existing = await this.prisma.taskAssignee.findUnique({
      where: {
        taskId_userId_type: {
          taskId,
          userId: createDto.userId,
          type: createDto.type,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Task assignee already exists for this user and type',
      );
    }

    // Create assignee
    const assignee = await this.prisma.taskAssignee.create({
      data: {
        orgId,
        taskId,
        userId: createDto.userId,
        type: createDto.type,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'task_assignee.create',
      EntityType.TASK,
      taskId,
      {
        assigneeId: assignee.id,
        assigneeUserId: assignee.userId,
        assigneeType: assignee.type,
      },
    );

    return {
      id: assignee.id,
      userId: assignee.userId,
      user: assignee.user,
      type: assignee.type,
      createdAt: assignee.createdAt,
    };
  }

  async findAll(taskId: string, orgId: string): Promise<TaskAssigneeResponseDto[]> {
    // Validate task exists and belongs to org
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.orgId !== orgId || task.deletedAt !== null) {
      throw new NotFoundException('Task not found');
    }

    // Fetch assignees
    const assignees = await this.prisma.taskAssignee.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return assignees.map((assignee) => ({
      id: assignee.id,
      userId: assignee.userId,
      user: assignee.user,
      type: assignee.type,
      createdAt: assignee.createdAt,
    }));
  }

  async remove(
    assigneeId: string,
    userId: string,
    orgId: string,
  ): Promise<{ message: string }> {
    // Check if assignee exists
    const assignee = await this.prisma.taskAssignee.findUnique({
      where: { id: assigneeId },
      include: {
        task: true,
      },
    });

    if (!assignee) {
      throw new NotFoundException('Task assignee not found');
    }

    if (assignee.orgId !== orgId) {
      throw new NotFoundException('Task assignee not found');
    }

    // Delete assignee
    await this.prisma.taskAssignee.delete({
      where: { id: assigneeId },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'task_assignee.delete',
      EntityType.TASK,
      assignee.taskId,
      {
        assigneeId: assignee.id,
        assigneeUserId: assignee.userId,
        assigneeType: assignee.type,
      },
    );

    return { message: 'Task assignee deleted successfully' };
  }
}

