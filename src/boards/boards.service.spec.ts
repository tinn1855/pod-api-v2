import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { EntityType } from '@prisma/client';

describe('BoardsService', () => {
  let service: BoardsService;
  let prismaService: PrismaService;
  let activityLogService: ActivityLogService;

  const mockPrismaService = {
    shop: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    board: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockActivityLogService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    prismaService = module.get<PrismaService>(PrismaService);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBoardDto = {
      title: 'Test Board',
      description: 'Test Description',
    };
    const userId = 'user-123';
    const orgId = 'org-456';

    it('should create a board successfully', async () => {
      const mockBoard = {
        id: 'board-123',
        orgId,
        title: createBoardDto.title,
        description: createBoardDto.description,
        note: null,
        shopId: null,
        assigneeDesignerId: null,
        dueDate: null,
        priority: null,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        },
        assigneeDesigner: null,
      };

      mockPrismaService.board.create.mockResolvedValue(mockBoard);
      mockActivityLogService.createLog.mockResolvedValue({});

      const result = await service.create(createBoardDto, userId, orgId);

      expect(result.id).toBe('board-123');
      expect(result.title).toBe(createBoardDto.title);
      expect(mockPrismaService.board.create).toHaveBeenCalled();
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'board.create',
        EntityType.BOARD,
        'board-123',
        expect.any(Object),
      );
    });
  });

  describe('remove', () => {
    const userId = 'user-123';
    const orgId = 'org-456';

    it('should soft delete a board', async () => {
      const mockBoard = {
        id: 'board-123',
        orgId,
        title: 'Test Board',
        deletedAt: null,
      };

      mockPrismaService.board.findUnique.mockResolvedValue(mockBoard);
      mockPrismaService.board.update.mockResolvedValue({
        ...mockBoard,
        deletedAt: new Date(),
      });
      mockActivityLogService.createLog.mockResolvedValue({});

      const result = await service.remove('board-123', userId, orgId);

      expect(result.message).toBe('Board deleted successfully');
      expect(mockPrismaService.board.update).toHaveBeenCalledWith({
        where: { id: 'board-123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'board.delete',
        EntityType.BOARD,
        'board-123',
        expect.any(Object),
      );
    });
  });
});

