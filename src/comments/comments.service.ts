import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import {
  CommentResponseDto,
  CommentListResponseDto,
} from './dto/comment-response.dto';
import { EntityType, Prisma } from '@prisma/client';

/**
 * Allowed entity types for comments
 */
const ALLOWED_ENTITY_TYPES = [
  EntityType.BOARD,
  EntityType.TASK,
  EntityType.DESIGN,
  EntityType.CONTENT,
] as const;

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
    orgId: string,
  ): Promise<CommentResponseDto> {
    // Validate entityType is allowed
    if (!ALLOWED_ENTITY_TYPES.includes(createCommentDto.entityType as any)) {
      throw new BadRequestException(
        'entityType must be one of: BOARD, TASK, DESIGN, CONTENT',
      );
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        orgId,
        entityType: createCommentDto.entityType,
        entityId: createCommentDto.entityId,
        body: createCommentDto.body,
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

    // Log activity (optional)
    await this.activityLogService.createLog(
      orgId,
      userId,
      'comment.create',
      createCommentDto.entityType,
      createCommentDto.entityId,
      {
        commentId: comment.id,
      },
    ).catch(() => {
      // Log activity is optional, don't fail if it errors
    });

    return this.mapToCommentResponse(comment);
  }

  async findAll(
    query: CommentQueryDto,
    orgId: string,
  ): Promise<CommentListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CommentWhereInput = {
      orgId,
      deletedAt: null, // Default filter: only non-deleted comments
    };

    if (query.entityType) {
      // Validate entityType is allowed
      if (!ALLOWED_ENTITY_TYPES.includes(query.entityType as any)) {
        throw new BadRequestException(
          'entityType must be one of: BOARD, TASK, DESIGN, CONTENT',
        );
      }
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
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
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments.map((comment) => this.mapToCommentResponse(comment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    orgId: string,
  ): Promise<CommentResponseDto> {
    // Check if comment exists
    const existingComment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.orgId !== orgId) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.deletedAt !== null) {
      throw new NotFoundException('Comment not found');
    }

    // Prepare update data
    const updateData: Prisma.CommentUncheckedUpdateInput = {};

    if (updateCommentDto.body !== undefined) {
      updateData.body = updateCommentDto.body;
    }

    // Update comment
    const updatedComment = await this.prisma.comment.update({
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

    // Log activity (optional)
    await this.activityLogService.createLog(
      orgId,
      userId,
      'comment.update',
      updatedComment.entityType,
      updatedComment.entityId,
      {
        commentId: id,
      },
    ).catch(() => {
      // Log activity is optional, don't fail if it errors
    });

    return this.mapToCommentResponse(updatedComment);
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.orgId !== orgId) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.deletedAt !== null) {
      throw new NotFoundException('Comment not found');
    }

    // Soft delete
    await this.prisma.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity (optional)
    await this.activityLogService.createLog(
      orgId,
      userId,
      'comment.delete',
      comment.entityType,
      comment.entityId,
      {
        commentId: id,
      },
    ).catch(() => {
      // Log activity is optional, don't fail if it errors
    });

    return { message: 'Comment deleted successfully' };
  }

  private mapToCommentResponse(
    comment: Prisma.CommentGetPayload<{
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
  ): CommentResponseDto {
    return {
      id: comment.id,
      orgId: comment.orgId,
      entityType: comment.entityType,
      entityId: comment.entityId,
      body: comment.body,
      createdById: comment.createdById,
      createdBy: comment.createdBy,
      createdAt: comment.createdAt,
    };
  }
}

