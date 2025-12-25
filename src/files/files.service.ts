import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileValidationService } from '../common/services/file-validation.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileResponseDto, CreateFileResponseDto } from './dto/file-response.dto';
import { FileType, Prisma, EntityType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private fileValidationService: FileValidationService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createFileDto: CreateFileDto,
    userId: string,
    orgId: string,
  ): Promise<CreateFileResponseDto> {
    // Validate file type using FileValidationService
    const fileType: FileType = this.fileValidationService.validateFileType(
      createFileDto.extension,
      createFileDto.mimeType,
    );

    // Generate unique storage key (stub - would use actual storage service)
    const storageKey = this.generateStorageKey(createFileDto.originalName);

    // Create file record
    const file = await this.prisma.file.create({
      data: {
        orgId,
        originalName: createFileDto.originalName,
        fileType,
        extension: createFileDto.extension.toLowerCase(),
        mimeType: createFileDto.mimeType || null,
        size: BigInt(createFileDto.size),
        storageKey,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
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
      'file.create',
      EntityType.BOARD, // Using BOARD as placeholder since File doesn't have EntityType
      file.id,
      {
        fileName: file.originalName,
        fileType: file.fileType,
        size: createFileDto.size,
      },
    );

    return {
      id: file.id,
      uploadUrl: null, // Stub - would return actual upload URL
    };
  }

  async findOne(id: string): Promise<FileResponseDto> {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.mapToFileResponse(file);
  }

  async update(
    id: string,
    updateFileDto: UpdateFileDto,
    userId: string,
    orgId: string,
  ): Promise<FileResponseDto> {
    // Check if file exists
    const file = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if file belongs to the same organization
    if (file.orgId !== orgId) {
      throw new NotFoundException('File not found');
    }

    // Prepare update data
    const updateData: Prisma.FileUpdateInput = {};

    if (updateFileDto.storageKey !== undefined) {
      updateData.storageKey = updateFileDto.storageKey;
    }

    if (updateFileDto.checksum !== undefined) {
      updateData.checksum = updateFileDto.checksum;
    }

    // Update file
    const updatedFile = await this.prisma.file.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
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
      'file.update',
      EntityType.BOARD, // Using BOARD as placeholder
      updatedFile.id,
      {
        updatedFields: Object.keys(updateData),
        storageKey: updateFileDto.storageKey,
      },
    );

    return this.mapToFileResponse(updatedFile);
  }

  private mapToFileResponse(
    file: Prisma.FileGetPayload<{
      include: {
        uploadedBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>,
  ): FileResponseDto {
    return {
      id: file.id,
      orgId: file.orgId,
      originalName: file.originalName,
      fileType: file.fileType,
      extension: file.extension,
      mimeType: file.mimeType,
      size: file.size.toString(),
      storageKey: file.storageKey,
      checksum: file.checksum,
      uploadedById: file.uploadedById,
      uploadedBy: file.uploadedBy,
      createdAt: file.createdAt,
    };
  }

  private generateStorageKey(originalName: string): string {
    // Generate unique storage key (stub implementation)
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `files/${timestamp}/${randomBytes}/${sanitizedName}`;
  }
}

