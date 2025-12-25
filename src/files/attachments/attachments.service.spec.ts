import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { EntityType, FilePurpose, FileType } from '@prisma/client';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prismaService: PrismaService;
  let activityLogService: ActivityLogService;

  const mockPrismaService = {
    file: {
      findUnique: jest.fn(),
    },
    entityFile: {
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
        AttachmentsService,
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

    service = module.get<AttachmentsService>(AttachmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAttachmentDto = {
      entityType: EntityType.DESIGN,
      entityId: 'design-123',
      fileId: 'file-123',
      purpose: FilePurpose.DESIGN_SOURCE,
    };
    const userId = 'user-123';
    const orgId = 'org-456';

    it('should create an attachment', async () => {
      const mockFile = {
        id: 'file-123',
        orgId,
        originalName: 'test.psd',
        fileType: FileType.PSD,
        extension: '.psd',
        size: BigInt(1048576),
        storageKey: 'files/123/test.psd',
      };

      const mockAttachment = {
        id: 'attachment-123',
        orgId,
        entityType: EntityType.DESIGN,
        entityId: 'design-123',
        fileId: 'file-123',
        purpose: FilePurpose.DESIGN_SOURCE,
        createdById: userId,
        createdAt: new Date(),
        file: mockFile,
        createdBy: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.entityFile.create.mockResolvedValue(mockAttachment);
      mockActivityLogService.createLog.mockResolvedValue({});

      const result = await service.create(
        createAttachmentDto,
        userId,
        orgId,
      );

      expect(result.id).toBe('attachment-123');
      expect(result.entityType).toBe(EntityType.DESIGN);
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'attachment.create',
        EntityType.DESIGN,
        'design-123',
        expect.any(Object),
      );
    });
  });

  describe('remove', () => {
    const userId = 'user-123';
    const orgId = 'org-456';

    it('should soft delete an attachment', async () => {
      const mockAttachment = {
        id: 'attachment-123',
        orgId,
        entityType: EntityType.DESIGN,
        entityId: 'design-123',
        fileId: 'file-123',
        purpose: FilePurpose.DESIGN_SOURCE,
        deletedAt: null,
        file: {
          id: 'file-123',
        },
      };

      mockPrismaService.entityFile.findUnique.mockResolvedValue(mockAttachment);
      mockPrismaService.entityFile.update.mockResolvedValue({
        ...mockAttachment,
        deletedAt: new Date(),
      });
      mockActivityLogService.createLog.mockResolvedValue({});

      const result = await service.remove('attachment-123', userId, orgId);

      expect(result.message).toBe('Attachment deleted successfully');
      expect(mockPrismaService.entityFile.update).toHaveBeenCalledWith({
        where: { id: 'attachment-123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockActivityLogService.createLog).toHaveBeenCalledWith(
        orgId,
        userId,
        'attachment.delete',
        EntityType.DESIGN,
        'design-123',
        expect.any(Object),
      );
    });
  });
});

