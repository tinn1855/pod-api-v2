import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import {
  ContentResponseDto,
  ContentListResponseDto,
} from './dto/content-response.dto';
import { EntityType, ContentStatus, Prisma } from '@prisma/client';

@Injectable()
export class ContentsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    boardId: string,
    createContentDto: CreateContentDto,
    userId: string,
    orgId: string,
  ): Promise<ContentResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Validate shop exists and belongs to org
    const shop = await this.prisma.shop.findUnique({
      where: { id: createContentDto.shopId },
    });

    if (!shop || shop.orgId !== orgId) {
      throw new NotFoundException('Shop not found');
    }

    // Validate account if provided
    if (createContentDto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: createContentDto.accountId },
      });

      if (
        !account ||
        account.orgId !== orgId ||
        account.shopId !== createContentDto.shopId ||
        account.deletedAt !== null
      ) {
        throw new NotFoundException('Account not found');
      }
    }

    // Create content
    const content = await this.prisma.content.create({
      data: {
        orgId,
        boardId,
        shopId: createContentDto.shopId,
        accountId: createContentDto.accountId || null,
        status: createContentDto.status || ContentStatus.NEW,
        title: createContentDto.title || null,
        description: createContentDto.description || null,
        meta: createContentDto.meta
          ? (createContentDto.meta as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        tags: createContentDto.tags
          ? (createContentDto.tags as Prisma.InputJsonValue)
          : Prisma.JsonNull,
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
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'content.create',
      EntityType.CONTENT,
      content.id,
      {
        title: content.title,
        boardId: content.boardId,
        shopId: content.shopId,
        status: content.status,
      },
    );

    return this.mapToContentResponse(content);
  }

  async findAll(
    boardId: string,
    query: ContentQueryDto,
    orgId: string,
  ): Promise<ContentListResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Build where clause
    const where: Prisma.ContentWhereInput = {
      boardId,
      deletedAt: null, // Default filter deletedAt IS NULL
    };

    // Apply filters
    if (query.status) {
      where.status = query.status;
    }

    if (query.accountId) {
      where.accountId = query.accountId;
    }

    // Fetch contents
    const contents = await this.prisma.content.findMany({
      where,
      include: {
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
    });

    return {
      data: contents.map((content) => this.mapToContentResponse(content)),
    };
  }

  async findOne(id: string, orgId: string): Promise<ContentResponseDto> {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.orgId !== orgId) {
      throw new NotFoundException('Content not found');
    }

    if (content.deletedAt !== null) {
      throw new NotFoundException('Content not found');
    }

    return this.mapToContentResponse(content);
  }

  async update(
    id: string,
    updateContentDto: UpdateContentDto,
    userId: string,
    orgId: string,
  ): Promise<ContentResponseDto> {
    // Check if content exists
    const existingContent = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!existingContent) {
      throw new NotFoundException('Content not found');
    }

    if (existingContent.orgId !== orgId) {
      throw new NotFoundException('Content not found');
    }

    if (existingContent.deletedAt !== null) {
      throw new NotFoundException('Content not found');
    }

    // Prepare update data
    const updateData: Prisma.ContentUncheckedUpdateInput = {};

    if (updateContentDto.title !== undefined) {
      updateData.title = updateContentDto.title || null;
    }

    if (updateContentDto.description !== undefined) {
      updateData.description = updateContentDto.description || null;
    }

    if (updateContentDto.status !== undefined) {
      updateData.status = updateContentDto.status;
    }

    if (updateContentDto.meta !== undefined) {
      updateData.meta = updateContentDto.meta
        ? (updateContentDto.meta as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    if (updateContentDto.tags !== undefined) {
      updateData.tags = updateContentDto.tags
        ? (updateContentDto.tags as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    // Validate and update shop if provided
    if (updateContentDto.shopId !== undefined) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: updateContentDto.shopId },
      });

      if (!shop || shop.orgId !== orgId) {
        throw new NotFoundException('Shop not found');
      }

      updateData.shopId = updateContentDto.shopId;
    }

    // Validate and update account if provided
    if (updateContentDto.accountId !== undefined) {
      const targetShopId = updateContentDto.shopId || existingContent.shopId;

      if (updateContentDto.accountId) {
        const account = await this.prisma.account.findUnique({
          where: { id: updateContentDto.accountId },
        });

        if (
          !account ||
          account.orgId !== orgId ||
          account.shopId !== targetShopId ||
          account.deletedAt !== null
        ) {
          throw new NotFoundException('Account not found');
        }
      }

      updateData.accountId = updateContentDto.accountId || null;
    }

    // Update content
    const updatedContent = await this.prisma.content.update({
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
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'content.update',
      EntityType.CONTENT,
      updatedContent.id,
      {
        updatedFields: Object.keys(updateData),
      },
    );

    return this.mapToContentResponse(updatedContent);
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if content exists
    const content = await this.prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    if (content.orgId !== orgId) {
      throw new NotFoundException('Content not found');
    }

    if (content.deletedAt !== null) {
      throw new NotFoundException('Content not found');
    }

    // Soft delete
    await this.prisma.content.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'content.delete',
      EntityType.CONTENT,
      id,
      {
        title: content.title,
        boardId: content.boardId,
      },
    );

    return { message: 'Content deleted successfully' };
  }

  private mapToContentResponse(
    content: Prisma.ContentGetPayload<{
      include: {
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>,
  ): ContentResponseDto {
    return {
      id: content.id,
      orgId: content.orgId,
      boardId: content.boardId,
      shopId: content.shopId,
      accountId: content.accountId,
      status: content.status,
      title: content.title,
      description: content.description,
      meta: content.meta,
      tags: content.tags,
      createdById: content.createdById,
      createdBy: content.createdBy,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }
}

