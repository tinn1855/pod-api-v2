import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PositionKeyService } from '../common/services/position-key.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto, TaskScope } from './dto/task-query.dto';
import {
  TaskResponseDto,
  TaskListResponseDto,
  TaskGroupedResponseDto,
  TaskAssigneeResponseDto,
} from './dto/task-response.dto';
import { EntityType, TaskColumn, Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
    private positionKeyService: PositionKeyService,
  ) {}

  async create(
    boardId: string,
    createTaskDto: CreateTaskDto,
    userId: string,
    orgId: string,
  ): Promise<TaskResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Get last position key in NEW_IDEA column
    const lastTask = await this.prisma.task.findFirst({
      where: {
        boardId,
        column: TaskColumn.NEW_IDEA,
        deletedAt: null,
      },
      orderBy: {
        positionKey: 'desc',
      },
    });

    // Generate position key at the end
    const positionKey = this.positionKeyService.generateBetween(
      lastTask?.positionKey || null,
      null,
    );

    // Validate design if provided
    if (createTaskDto.designId) {
      const design = await this.prisma.design.findUnique({
        where: { id: createTaskDto.designId },
      });

      if (!design || design.orgId !== orgId) {
        throw new NotFoundException('Design not found');
      }
    }

    // Validate content if provided
    if (createTaskDto.contentId) {
      const content = await this.prisma.content.findUnique({
        where: { id: createTaskDto.contentId },
      });

      if (!content || content.orgId !== orgId) {
        throw new NotFoundException('Content not found');
      }
    }

    // Create task
    const task = await this.prisma.task.create({
      data: {
        orgId,
        boardId,
        column: TaskColumn.NEW_IDEA,
        positionKey,
        title: createTaskDto.title,
        description: createTaskDto.description || null,
        note: createTaskDto.note || null,
        designId: createTaskDto.designId || null,
        contentId: createTaskDto.contentId || null,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'task.create',
      EntityType.TASK,
      task.id,
      {
        title: task.title,
        boardId: task.boardId,
        column: task.column,
      },
    );

    return this.mapToTaskResponse(task);
  }

  async findAll(
    boardId: string,
    query: TaskQueryDto,
    userId: string,
    orgId: string,
  ): Promise<TaskListResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Build where clause
    const where: Prisma.TaskWhereInput = {
      boardId,
      deletedAt: null,
    };

    // Apply scope filter
    if (query.scope === TaskScope.MINE) {
      where.OR = [
        { createdById: userId },
        {
          assignees: {
            some: {
              userId,
            },
          },
        },
      ];
    }

    // Fetch tasks grouped by column, ordered by positionKey
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { column: 'asc' },
        { positionKey: 'asc' },
      ],
    });

    // Group by column
    const grouped = tasks.reduce((acc, task) => {
      const column = task.column;
      if (!acc[column]) {
        acc[column] = [];
      }
      acc[column].push(this.mapToTaskResponse(task));
      return acc;
    }, {} as Record<TaskColumn, TaskResponseDto[]>);

    // Convert to array format
    const data: TaskGroupedResponseDto[] = Object.values(TaskColumn).map(
      (column) => ({
        column,
        tasks: grouped[column] || [],
      }),
    );

    return { data };
  }

  async findOne(id: string, orgId: string): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.orgId !== orgId) {
      throw new NotFoundException('Task not found');
    }

    if (task.deletedAt !== null) {
      throw new NotFoundException('Task not found');
    }

    return this.mapToTaskResponse(task);
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
    orgId: string,
  ): Promise<TaskResponseDto> {
    // Check if task exists
    const existingTask = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (existingTask.orgId !== orgId) {
      throw new NotFoundException('Task not found');
    }

    if (existingTask.deletedAt !== null) {
      throw new NotFoundException('Task not found');
    }

    // Prepare update data
    const updateData: Prisma.TaskUncheckedUpdateInput = {};
    let isMoveOperation = false;
    let oldColumn: TaskColumn | null = null;

    // Handle field updates
    if (updateTaskDto.title !== undefined) {
      updateData.title = updateTaskDto.title;
    }

    if (updateTaskDto.description !== undefined) {
      updateData.description = updateTaskDto.description || null;
    }

    if (updateTaskDto.note !== undefined) {
      updateData.note = updateTaskDto.note || null;
    }

    if (updateTaskDto.designId !== undefined) {
      if (updateTaskDto.designId) {
        const design = await this.prisma.design.findUnique({
          where: { id: updateTaskDto.designId },
        });

        if (!design || design.orgId !== orgId) {
          throw new NotFoundException('Design not found');
        }
      }
      updateData.designId = updateTaskDto.designId || null;
    }

    if (updateTaskDto.contentId !== undefined) {
      if (updateTaskDto.contentId) {
        const content = await this.prisma.content.findUnique({
          where: { id: updateTaskDto.contentId },
        });

        if (!content || content.orgId !== orgId) {
          throw new NotFoundException('Content not found');
        }
      }
      updateData.contentId = updateTaskDto.contentId || null;
    }

    // Handle drag/drop (column + position)
    if (updateTaskDto.column !== undefined || updateTaskDto.position !== undefined) {
      isMoveOperation = true;
      oldColumn = existingTask.column;
      const targetColumn = updateTaskDto.column || existingTask.column;

      // Validate position references if provided
      if (updateTaskDto.position) {
        const { beforeId, afterId } = updateTaskDto.position;

        if (beforeId) {
          const beforeTask = await this.prisma.task.findUnique({
            where: { id: beforeId },
          });

          if (
            !beforeTask ||
            beforeTask.boardId !== existingTask.boardId ||
            beforeTask.column !== targetColumn ||
            beforeTask.deletedAt !== null
          ) {
            throw new BadRequestException('Invalid beforeId reference');
          }
        }

        if (afterId) {
          const afterTask = await this.prisma.task.findUnique({
            where: { id: afterId },
          });

          if (
            !afterTask ||
            afterTask.boardId !== existingTask.boardId ||
            afterTask.column !== targetColumn ||
            afterTask.deletedAt !== null
          ) {
            throw new BadRequestException('Invalid afterId reference');
          }
        }

        // Generate new position key
        const beforeTask = beforeId
          ? await this.prisma.task.findUnique({
              where: { id: beforeId },
              select: { positionKey: true },
            })
          : null;

        const afterTask = afterId
          ? await this.prisma.task.findUnique({
              where: { id: afterId },
              select: { positionKey: true },
            })
          : null;

        const newPositionKey = this.positionKeyService.generateBetween(
          beforeTask?.positionKey || null,
          afterTask?.positionKey || null,
        );

        updateData.positionKey = newPositionKey;
      } else if (updateTaskDto.column !== undefined && updateTaskDto.column !== existingTask.column) {
        // Column changed but no position specified - append to end
        const lastTask = await this.prisma.task.findFirst({
          where: {
            boardId: existingTask.boardId,
            column: targetColumn,
            deletedAt: null,
          },
          orderBy: {
            positionKey: 'desc',
          },
        });

        const newPositionKey = this.positionKeyService.generateBetween(
          lastTask?.positionKey || null,
          null,
        );

        updateData.positionKey = newPositionKey;
      }

      if (updateTaskDto.column !== undefined) {
        updateData.column = updateTaskDto.column;
      }
    }

    // Use transaction for move operations
    if (isMoveOperation) {
      return this.prisma.$transaction(async (tx) => {
        const updatedTask = await tx.task.update({
          where: { id },
          data: updateData,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignees: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        // Log activity
        const logAction = updateTaskDto.column !== undefined && updateTaskDto.column !== oldColumn
          ? 'task.move'
          : 'task.update';

        await this.activityLogService.createLog(
          orgId,
          userId,
          logAction,
          EntityType.TASK,
          updatedTask.id,
          {
            ...(logAction === 'task.move' && {
              oldColumn,
              newColumn: updatedTask.column,
              positionKey: updatedTask.positionKey,
            }),
            updatedFields: Object.keys(updateData),
          },
        );

        return this.mapToTaskResponse(updatedTask);
      });
    } else {
      // Regular update
      const updatedTask = await this.prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignees: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Log activity
      await this.activityLogService.createLog(
        orgId,
        userId,
        'task.update',
        EntityType.TASK,
        updatedTask.id,
        {
          updatedFields: Object.keys(updateData),
        },
      );

      return this.mapToTaskResponse(updatedTask);
    }
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if task exists
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.orgId !== orgId) {
      throw new NotFoundException('Task not found');
    }

    if (task.deletedAt !== null) {
      throw new NotFoundException('Task not found');
    }

    // Soft delete
    await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'task.delete',
      EntityType.TASK,
      id,
      {
        title: task.title,
        boardId: task.boardId,
      },
    );

    return { message: 'Task deleted successfully' };
  }

  private mapToTaskResponse(
    task: Prisma.TaskGetPayload<{
      include: {
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
        assignees: {
          include: {
            user: {
              select: {
                id: true;
                name: true;
                email: true;
              };
            };
          };
        };
      };
    }>,
  ): TaskResponseDto {
    return {
      id: task.id,
      orgId: task.orgId,
      boardId: task.boardId,
      column: task.column,
      positionKey: task.positionKey,
      title: task.title,
      description: task.description,
      note: task.note,
      designId: task.designId,
      contentId: task.contentId,
      createdById: task.createdById,
      createdBy: task.createdBy,
      assignees: task.assignees.map((assignee) => ({
        id: assignee.id,
        userId: assignee.userId,
        user: assignee.user,
        type: assignee.type,
        createdAt: assignee.createdAt,
      })),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

