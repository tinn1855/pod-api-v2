import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../../common/services/activity-log.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { AttachmentQueryDto } from './dto/attachment-query.dto';
import {
  AttachmentResponseDto,
  AttachmentListResponseDto,
} from './dto/attachment-response.dto';
import { EntityType, Prisma } from '@prisma/client';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createAttachmentDto: CreateAttachmentDto,
    userId: string,
    orgId: string,
  ): Promise<AttachmentResponseDto> {
    // Verify file exists and belongs to the same organization
    const file = await this.prisma.file.findUnique({
      where: { id: createAttachmentDto.fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.orgId !== orgId) {
      throw new NotFoundException('File not found');
    }

    // Check if attachment already exists (optional - might allow duplicates)
    // Skipping duplicate check for now as business rules may allow multiple attachments

    // Create attachment
    const attachment = await this.prisma.entityFile.create({
      data: {
        orgId,
        entityType: createAttachmentDto.entityType,
        entityId: createAttachmentDto.entityId,
        fileId: createAttachmentDto.fileId,
        purpose: createAttachmentDto.purpose,
        createdById: userId,
      },
      include: {
        file: {
          select: {
            id: true,
            originalName: true,
            fileType: true,
            extension: true,
            size: true,
            storageKey: true,
          },
        },
        createdBy: {
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
      'attachment.create',
      createAttachmentDto.entityType,
      createAttachmentDto.entityId,
      {
        attachmentId: attachment.id,
        fileId: createAttachmentDto.fileId,
        purpose: createAttachmentDto.purpose,
      },
    );

    return this.mapToAttachmentResponse(attachment);
  }

  async findAll(
    query: AttachmentQueryDto,
    orgId: string,
  ): Promise<AttachmentListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.EntityFileWhereInput = {
      orgId,
      deletedAt: null, // Only non-deleted attachments
    };

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    const [attachments, total] = await Promise.all([
      this.prisma.entityFile.findMany({
        where,
        skip,
        take: limit,
        include: {
          file: {
            select: {
              id: true,
              originalName: true,
              fileType: true,
              extension: true,
              size: true,
              storageKey: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.entityFile.count({ where }),
    ]);

    return {
      data: attachments.map((attachment) =>
        this.mapToAttachmentResponse(attachment),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if attachment exists
    const attachment = await this.prisma.entityFile.findUnique({
      where: { id },
      include: {
        file: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.orgId !== orgId) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.deletedAt !== null) {
      throw new NotFoundException('Attachment not found');
    }

    // Soft delete
    await this.prisma.entityFile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'attachment.delete',
      attachment.entityType,
      attachment.entityId,
      {
        attachmentId: id,
        fileId: attachment.fileId,
        purpose: attachment.purpose,
      },
    );

    return { message: 'Attachment deleted successfully' };
  }

  private mapToAttachmentResponse(
    attachment: Prisma.EntityFileGetPayload<{
      include: {
        file: {
          select: {
            id: true;
            originalName: true;
            fileType: true;
            extension: true;
            size: true;
            storageKey: true;
          };
        };
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>,
  ): AttachmentResponseDto {
    return {
      id: attachment.id,
      orgId: attachment.orgId,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileId: attachment.fileId,
      purpose: attachment.purpose,
      file: {
        id: attachment.file.id,
        originalName: attachment.file.originalName,
        fileType: attachment.file.fileType,
        extension: attachment.file.extension,
        size: attachment.file.size.toString(),
        storageKey: attachment.file.storageKey,
      },
      createdById: attachment.createdById,
      createdBy: attachment.createdBy,
      createdAt: attachment.createdAt,
    };
  }
}

