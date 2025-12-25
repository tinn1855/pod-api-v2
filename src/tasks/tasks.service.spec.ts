import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PositionKeyService } from '../common/services/position-key.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskColumn, EntityType } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: PrismaService;
  let activityLogService: ActivityLogService;
  let positionKeyService: PositionKeyService;

  const mockPrismaService = {
    board: {
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    design: {
      findUnique: jest.fn(),
    },
    content: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      // Return a transaction client that has the same structure
      const txClient = {
        task: {
          update: mockPrismaService.task.update,
        },
      };
      return callback(txClient);
    }),
  };

  const mockActivityLogService = {
    createLog: jest.fn(),
  };

  const mockPositionKeyService = {
    generateBetween: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: PositionKeyService,
          useValue: mockPositionKeyService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);
    positionKeyService = module.get<PositionKeyService>(PositionKeyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update - drag/drop reorder', () => {
    const taskId = 'task-123';
    const userId = 'user-123';
    const orgId = 'org-456';
    const boardId = 'board-789';

    const existingTask = {
      id: taskId,
      orgId,
      boardId,
      column: TaskColumn.NEW_IDEA,
      positionKey: 'm',
      title: 'Test Task',
      deletedAt: null,
    };

    beforeEach(() => {
      mockPrismaService.task.findUnique.mockResolvedValue(existingTask);
    });

    it('should reorder task with beforeId and afterId', async () => {
      const beforeTask = { id: 'before-123', positionKey: 'a' };
      const afterTask = { id: 'after-123', positionKey: 'z' };
      const newPositionKey = 'm';

      mockPrismaService.task.findUnique
        .mockResolvedValueOnce(existingTask) // initial task check
        .mockResolvedValueOnce({
          ...beforeTask,
          boardId,
          column: TaskColumn.CHECK_DESIGN,
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          ...afterTask,
          boardId,
          column: TaskColumn.CHECK_DESIGN,
          deletedAt: null,
        })
        .mockResolvedValueOnce({ positionKey: beforeTask.positionKey })
        .mockResolvedValueOnce({ positionKey: afterTask.positionKey });

      mockPositionKeyService.generateBetween.mockReturnValue(newPositionKey);

      const updatedTask = {
        ...existingTask,
        column: TaskColumn.CHECK_DESIGN,
        positionKey: newPositionKey,
        createdBy: { id: userId, name: 'User', email: 'user@example.com' },
        assignees: [],
      };

      mockPrismaService.task.update.mockResolvedValue(updatedTask);
      mockActivityLogService.createLog.mockResolvedValue({});

      const updateDto = {
        column: TaskColumn.CHECK_DESIGN,
        position: {
          beforeId: beforeTask.id,
          afterId: afterTask.id,
        },
      };

      const result = await service.update(taskId, updateDto, userId, orgId);

      expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
      });
      expect(mockPositionKeyService.generateBetween).toHaveBeenCalledWith(
        beforeTask.positionKey,
        afterTask.positionKey,
      );
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'task.move',
        EntityType.TASK,
        taskId,
        expect.objectContaining({
          oldColumn: TaskColumn.NEW_IDEA,
          newColumn: TaskColumn.CHECK_DESIGN,
          positionKey: newPositionKey,
        }),
      );
    });

    it('should throw BadRequestException if beforeId task belongs to different board', async () => {
      const beforeTask = { id: 'before-123', boardId: 'different-board' };

      mockPrismaService.task.findUnique
        .mockResolvedValueOnce(existingTask)
        .mockResolvedValueOnce({
          ...beforeTask,
          column: TaskColumn.CHECK_DESIGN,
          deletedAt: null,
        });

      const updateDto = {
        column: TaskColumn.CHECK_DESIGN,
        position: {
          beforeId: beforeTask.id,
        },
      };

      await expect(
        service.update(taskId, updateDto, userId, orgId),
      ).rejects.toThrow(BadRequestException);

      expect(mockPositionKeyService.generateBetween).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if beforeId task is in different column', async () => {
      const beforeTask = { id: 'before-123', boardId, column: TaskColumn.DONE };

      mockPrismaService.task.findUnique
        .mockResolvedValueOnce(existingTask)
        .mockResolvedValueOnce({
          ...beforeTask,
          deletedAt: null,
        });

      const updateDto = {
        column: TaskColumn.CHECK_DESIGN,
        position: {
          beforeId: beforeTask.id,
        },
      };

      await expect(
        service.update(taskId, updateDto, userId, orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append to end when column changes without position', async () => {
      const lastTask = { positionKey: 'z' };
      const newPositionKey = 'z0';

      mockPrismaService.task.findFirst.mockResolvedValue(lastTask);
      mockPositionKeyService.generateBetween.mockReturnValue(newPositionKey);

      const updatedTask = {
        ...existingTask,
        column: TaskColumn.CHECK_DESIGN,
        positionKey: newPositionKey,
        createdBy: { id: userId, name: 'User', email: 'user@example.com' },
        assignees: [],
      };

      mockPrismaService.task.update.mockResolvedValue(updatedTask);
      mockActivityLogService.createLog.mockResolvedValue({});

      const updateDto = {
        column: TaskColumn.CHECK_DESIGN,
      };

      const result = await service.update(taskId, updateDto, userId, orgId);

      expect(mockPrismaService.task.findFirst).toHaveBeenCalledWith({
        where: {
          boardId,
          column: TaskColumn.CHECK_DESIGN,
          deletedAt: null,
        },
        orderBy: {
          positionKey: 'desc',
        },
      });
      expect(mockPositionKeyService.generateBetween).toHaveBeenCalledWith(
        lastTask.positionKey,
        null,
      );
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'task.move',
        EntityType.TASK,
        taskId,
        expect.any(Object),
      );
    });
  });
});

