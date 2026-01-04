import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import {
  ContentResponseDto,
  ContentListResponseDto,
} from './dto/content-response.dto';
import { ActivityLogService } from '../common/services/activity-log.service';
import { Prisma, EntityType, ContentStatus } from '@prisma/client';

@Injectable()
export class ContentsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * Check if user can access content (via board/shop ownership or admin)
   */
  private async checkContentAccess(
    contentId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
  ): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        board: {
          select: {
            orgId: true,
            shopId: true,
            createdById: true,
          },
        },
        shop: {
          select: {
            orgId: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // Verify orgId matches
    if (content.orgId !== orgId) {
      throw new ForbiddenException(
        'You do not have permission to access this content',
      );
    }

    // Admin can access any content in their org
    if (userRoleName === 'ADMIN' || userRoleName === 'SUPER_ADMIN') {
      return;
    }

    // Check shop ownership (SELLER can access their own shop's content)
    if (content.shop.ownerUserId === userId) {
      return;
    }

    // Check board creator access
    if (content.board.createdById === userId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to access this content',
    );
  }

  /**
   * Validate board and shop exist and belong to org
   */
  private async validateBoardAndShop(
    boardId: string,
    shopId: string,
    orgId: string,
  ): Promise<void> {
    const [board, shop] = await Promise.all([
      this.prisma.board.findUnique({
        where: { id: boardId },
        select: { orgId: true, deletedAt: true },
      }),
      this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { orgId: true },
      }),
    ]);

    if (!board || board.deletedAt !== null) {
      throw new NotFoundException('Board not found or deleted');
    }

    if (board.orgId !== orgId) {
      throw new ForbiddenException('Board does not belong to your organization');
    }

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.orgId !== orgId) {
      throw new ForbiddenException('Shop does not belong to your organization');
    }
  }

  async create(
    createContentDto: CreateContentDto,
    orgId: string,
    userId: string,
    actorId: string,
  ): Promise<ContentResponseDto> {
    // Validate board and shop
    await this.validateBoardAndShop(
      createContentDto.boardId,
      createContentDto.shopId,
      orgId,
    );

    // Validate account if provided
    if (createContentDto.accountId) {
      const account = await this.prisma.account.findUnique({
        where: { id: createContentDto.accountId },
        select: { orgId: true, shopId: true, deletedAt: true },
      });

      if (!account || account.deletedAt !== null) {
        throw new NotFoundException('Account not found or deleted');
      }

      if (account.orgId !== orgId) {
        throw new ForbiddenException(
          'Account does not belong to your organization',
        );
      }

      if (account.shopId !== createContentDto.shopId) {
        throw new BadRequestException(
          'Account does not belong to the specified shop',
        );
      }
    }

    // Create content
    const content = await this.prisma.content.create({
      data: {
        orgId,
        boardId: createContentDto.boardId,
        shopId: createContentDto.shopId,
        accountId: createContentDto.accountId,
        status: createContentDto.status || ContentStatus.NEW,
        title: createContentDto.title,
        description: createContentDto.description,
        meta:
          createContentDto.meta === undefined
            ? undefined
            : (createContentDto.meta as Prisma.InputJsonValue),
        tags:
          createContentDto.tags === undefined
            ? undefined
            : (createContentDto.tags as Prisma.InputJsonValue),
        createdById: userId,
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'CREATE',
      EntityType.CONTENT,
      content.id,
      {
        boardId: content.boardId,
        shopId: content.shopId,
        status: content.status,
      },
    );

    return this.mapToContentResponse(content);
  }

  async findAll(
    query: ContentQueryDto,
    orgId: string,
    userId: string,
    userRoleName: string,
  ): Promise<ContentListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ContentWhereInput = {
      orgId,
      deletedAt: null,
    };

    if (query.boardId) {
      where.boardId = query.boardId;
    }

    if (query.shopId) {
      where.shopId = query.shopId;
    }

    if (query.status) {
      where.status = query.status;
    }

    // SELLER sees only content from their own shops
    if (userRoleName !== 'ADMIN' && userRoleName !== 'SUPER_ADMIN') {
      const userShops = await this.prisma.shop.findMany({
        where: {
          orgId,
          ownerUserId: userId,
        },
        select: { id: true },
      });

      const shopIds = userShops.map((shop) => shop.id);
      if (shopIds.length === 0) {
        // User has no shops, return empty result
        return {
          data: [],
          total: 0,
          page,
          limit,
        };
      }

      where.shopId = { in: shopIds };
    }

    const [contents, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      data: contents.map((content) => this.mapToContentResponse(content)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    contentId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
  ): Promise<ContentResponseDto> {
    // Check access
    await this.checkContentAccess(contentId, userId, userRoleName, orgId);

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.deletedAt !== null) {
      throw new NotFoundException('Content not found');
    }

    return this.mapToContentResponse(content);
  }

  async update(
    contentId: string,
    updateContentDto: UpdateContentDto,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<ContentResponseDto> {
    // Check access
    await this.checkContentAccess(contentId, userId, userRoleName, orgId);

    // Build update data
    const updateData: Prisma.ContentUpdateInput = {};

    if (updateContentDto.status !== undefined) {
      updateData.status = updateContentDto.status;
    }

    if (updateContentDto.title !== undefined) {
      updateData.title = updateContentDto.title;
    }

    if (updateContentDto.description !== undefined) {
      updateData.description = updateContentDto.description;
    }

    if (updateContentDto.meta !== undefined) {
      updateData.meta =
        updateContentDto.meta === null
          ? Prisma.JsonNull
          : (updateContentDto.meta as Prisma.InputJsonValue);
    }

    if (updateContentDto.tags !== undefined) {
      updateData.tags =
        updateContentDto.tags === null
          ? Prisma.JsonNull
          : (updateContentDto.tags as Prisma.InputJsonValue);
    }

    const content = await this.prisma.content.update({
      where: { id: contentId },
      data: updateData,
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'UPDATE',
      EntityType.CONTENT,
      content.id,
      {
        updatedFields: Object.keys(updateContentDto),
      },
    );

    return this.mapToContentResponse(content);
  }

  async remove(
    contentId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<void> {
    // Check access
    await this.checkContentAccess(contentId, userId, userRoleName, orgId);

    // Soft delete
    await this.prisma.$transaction(async (tx) => {
      await tx.content.update({
        where: { id: contentId },
        data: { deletedAt: new Date() },
      });

      // Log activity
      await this.activityLogService.createLog(
        orgId,
        actorId,
        'DELETE',
        EntityType.CONTENT,
        contentId,
        {},
      );
    });
  }

  private mapToContentResponse(content: any): ContentResponseDto {
    return {
      id: content.id,
      orgId: content.orgId,
      boardId: content.boardId,
      shopId: content.shopId,
      accountId: content.accountId,
      status: content.status,
      title: content.title,
      description: content.description,
      meta: content.meta as Record<string, unknown> | null,
      tags: content.tags as string[] | Record<string, unknown> | null,
      createdById: content.createdById,
      deletedAt: content.deletedAt,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }
}

