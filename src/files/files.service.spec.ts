import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileValidationService } from '../common/services/file-validation.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { FileType } from '@prisma/client';

describe('FilesService', () => {
  let service: FilesService;
  let prismaService: PrismaService;
  let fileValidationService: FileValidationService;
  let activityLogService: ActivityLogService;

  const mockPrismaService = {
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockFileValidationService = {
    validateFileType: jest.fn(),
  };

  const mockActivityLogService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileValidationService,
          useValue: mockFileValidationService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
    prismaService = module.get<PrismaService>(PrismaService);
    fileValidationService = module.get<FileValidationService>(
      FileValidationService,
    );
    activityLogService = module.get<ActivityLogService>(ActivityLogService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createFileDto = {
      originalName: 'test.psd',
      extension: '.psd',
      mimeType: 'image/vnd.adobe.photoshop',
      size: '1048576',
    };
    const userId = 'user-123';
    const orgId = 'org-456';

    it('should create a file and return id with uploadUrl', async () => {
      const mockFile = {
        id: 'file-123',
        orgId,
        originalName: createFileDto.originalName,
        fileType: FileType.PSD,
        extension: '.psd',
        mimeType: createFileDto.mimeType,
        size: BigInt(createFileDto.size),
        storageKey: 'files/123/test.psd',
        checksum: null,
        uploadedById: userId,
        createdAt: new Date(),
        uploadedBy: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockFileValidationService.validateFileType.mockReturnValue(FileType.PSD);
      mockPrismaService.file.create.mockResolvedValue(mockFile);
      mockActivityLogService.createLog.mockResolvedValue({});

      const result = await service.create(createFileDto, userId, orgId);

      expect(result.id).toBe('file-123');
      expect(result.uploadUrl).toBeNull();
      expect(mockFileValidationService.validateFileType).toHaveBeenCalledWith(
        '.psd',
        'image/vnd.adobe.photoshop',
      );
      expect(mockPrismaService.file.create).toHaveBeenCalled();
      expect(mockActivityLogService.createLog).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return file if found', async () => {
      const mockFile = {
        id: 'file-123',
        orgId: 'org-456',
        originalName: 'test.psd',
        fileType: FileType.PSD,
        extension: '.psd',
        mimeType: 'image/vnd.adobe.photoshop',
        size: BigInt(1048576),
        storageKey: 'files/123/test.psd',
        checksum: null,
        uploadedById: 'user-123',
        createdAt: new Date(),
        uploadedBy: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);

      const result = await service.findOne('file-123');

      expect(result.id).toBe('file-123');
      expect(result.originalName).toBe('test.psd');
    });

    it('should throw NotFoundException if file not found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(service.findOne('file-123')).rejects.toThrow(
        'File not found',
      );
    });
  });
});

