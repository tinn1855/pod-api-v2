import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, Prisma } from '@prisma/client';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    activityLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    const orgId = 'org-123';
    const actorId = 'user-456';
    const action = 'CREATE';
    const entityType = EntityType.TASK;
    const entityId = 'task-789';

    it('should create an activity log without metadata', async () => {
      const mockLog = {
        id: 'log-123',
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.activityLog.create.mockResolvedValue(mockLog);

      const result = await service.createLog(
        orgId,
        actorId,
        action,
        entityType,
        entityId,
      );

      expect(result).toEqual(mockLog);
      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith({
        data: {
          orgId,
          actorId,
          action,
          entityType,
          entityId,
          metadata: undefined,
        },
      });
    });

    it('should create an activity log with metadata', async () => {
      const metadata = { key: 'value', count: 42 };
      const mockLog = {
        id: 'log-123',
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        metadata,
        createdAt: new Date(),
      };

      mockPrismaService.activityLog.create.mockResolvedValue(mockLog);

      const result = await service.createLog(
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        metadata,
      );

      expect(result).toEqual(mockLog);
      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith({
        data: {
          orgId,
          actorId,
          action,
          entityType,
          entityId,
          metadata,
        },
      });
    });

    it('should create an activity log with null metadata when provided as null', async () => {
      const mockLog = {
        id: 'log-123',
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.activityLog.create.mockResolvedValue(mockLog);

      const result = await service.createLog(
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        null,
      );

      expect(result).toEqual(mockLog);
      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith({
        data: {
          orgId,
          actorId,
          action,
          entityType,
          entityId,
          metadata: Prisma.JsonNull,
        },
      });
    });

    it('should create logs for different entity types', async () => {
      const entityTypes = [
        EntityType.BOARD,
        EntityType.TASK,
        EntityType.DESIGN,
        EntityType.FOLDER,
        EntityType.CONTENT,
      ];

      for (const type of entityTypes) {
        const mockLog = {
          id: `log-${type}`,
          orgId,
          actorId,
          action: 'UPDATE',
          entityType: type,
          entityId: `entity-${type}`,
          metadata: null,
          createdAt: new Date(),
        };

        mockPrismaService.activityLog.create.mockResolvedValueOnce(mockLog);

        const result = await service.createLog(
          orgId,
          actorId,
          'UPDATE',
          type,
          `entity-${type}`,
        );

        expect(result.entityType).toBe(type);
      }
    });

    it('should create logs with different actions', async () => {
      const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'];

      for (const act of actions) {
        const mockLog = {
          id: `log-${act}`,
          orgId,
          actorId,
          action: act,
          entityType,
          entityId,
          metadata: null,
          createdAt: new Date(),
        };

        mockPrismaService.activityLog.create.mockResolvedValueOnce(mockLog);

        const result = await service.createLog(
          orgId,
          actorId,
          act,
          entityType,
          entityId,
        );

        expect(result.action).toBe(act);
      }
    });

    it('should handle complex metadata objects', async () => {
      const metadata = {
        oldStatus: 'PENDING',
        newStatus: 'APPROVED',
        reason: 'Meets quality standards',
        reviewer: 'user-123',
        timestamp: new Date().toISOString(),
      };

      const mockLog = {
        id: 'log-123',
        orgId,
        actorId,
        action: 'UPDATE',
        entityType,
        entityId,
        metadata,
        createdAt: new Date(),
      };

      mockPrismaService.activityLog.create.mockResolvedValue(mockLog);

      const result = await service.createLog(
        orgId,
        actorId,
        'UPDATE',
        entityType,
        entityId,
        metadata,
      );

      expect(result.metadata).toEqual(metadata);
    });
  });
});

