import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardQueryDto } from './dto/board-query.dto';
import {
  BoardResponseDto,
  BoardListResponseDto,
} from './dto/board-response.dto';
import { EntityType, Prisma } from '@prisma/client';

@Injectable()
export class BoardsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    createBoardDto: CreateBoardDto,
    userId: string,
    orgId: string,
  ): Promise<BoardResponseDto> {
    // Validate shop if provided
    if (createBoardDto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: createBoardDto.shopId },
      });

      if (!shop || shop.orgId !== orgId || shop.deletedAt !== null) {
        throw new NotFoundException('Shop not found');
      }
    }

    // Validate assignee designer if provided
    if (createBoardDto.assigneeDesignerId) {
      const designer = await this.prisma.user.findUnique({
        where: { id: createBoardDto.assigneeDesignerId },
      });

      if (!designer || designer.orgId !== orgId) {
        throw new NotFoundException('Assignee designer not found');
      }

      if (designer.deletedAt !== null) {
        throw new NotFoundException('Assignee designer not found');
      }
    }

    // Create board
    const board = await this.prisma.board.create({
      data: {
        orgId,
        title: createBoardDto.title,
        description: createBoardDto.description || null,
        note: createBoardDto.note || null,
        shopId: createBoardDto.shopId || null,
        assigneeDesignerId: createBoardDto.assigneeDesignerId || null,
        dueDate: createBoardDto.dueDate
          ? new Date(createBoardDto.dueDate)
          : null,
        priority: createBoardDto.priority || null,
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
        assigneeDesigner: {
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
      'board.create',
      EntityType.BOARD,
      board.id,
      {
        title: board.title,
        shopId: board.shopId,
      },
    );

    return this.mapToBoardResponse(board);
  }

  async findAll(
    query: BoardQueryDto,
    orgId: string,
  ): Promise<BoardListResponseDto> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BoardWhereInput = {
      orgId,
      deletedAt: null, // Only non-deleted boards
    };

    // Text search
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { note: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Filters
    if (query.createdById) {
      where.createdById = query.createdById;
    }

    if (query.assigneeDesignerId) {
      where.assigneeDesignerId = query.assigneeDesignerId;
    }

    if (query.shopId) {
      where.shopId = query.shopId;
    }

    const [boards, total] = await Promise.all([
      this.prisma.board.findMany({
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
          assigneeDesigner: {
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
      this.prisma.board.count({ where }),
    ]);

    return {
      data: boards.map((board) => this.mapToBoardResponse(board)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, orgId: string): Promise<BoardResponseDto> {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assigneeDesigner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.orgId !== orgId) {
      throw new NotFoundException('Board not found');
    }

    if (board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    return this.mapToBoardResponse(board);
  }

  async update(
    id: string,
    updateBoardDto: UpdateBoardDto,
    userId: string,
    orgId: string,
  ): Promise<BoardResponseDto> {
    // Check if board exists
    const existingBoard = await this.prisma.board.findUnique({
      where: { id },
    });

    if (!existingBoard) {
      throw new NotFoundException('Board not found');
    }

    if (existingBoard.orgId !== orgId) {
      throw new NotFoundException('Board not found');
    }

    if (existingBoard.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Validate shop if provided
    if (updateBoardDto.shopId !== undefined) {
      if (updateBoardDto.shopId) {
        const shop = await this.prisma.shop.findUnique({
          where: { id: updateBoardDto.shopId },
        });

        if (!shop || shop.orgId !== orgId || shop.deletedAt !== null) {
          throw new NotFoundException('Shop not found');
        }
      }
    }

    // Validate assignee designer if provided
    if (updateBoardDto.assigneeDesignerId !== undefined) {
      if (updateBoardDto.assigneeDesignerId) {
        const designer = await this.prisma.user.findUnique({
          where: { id: updateBoardDto.assigneeDesignerId },
        });

        if (!designer || designer.orgId !== orgId) {
          throw new NotFoundException('Assignee designer not found');
        }

        if (designer.deletedAt !== null) {
          throw new NotFoundException('Assignee designer not found');
        }
      }
    }

    // Prepare update data using UncheckedUpdateInput to allow direct field updates
    const updateData: Prisma.BoardUncheckedUpdateInput = {};

    if (updateBoardDto.title !== undefined) {
      updateData.title = updateBoardDto.title;
    }

    if (updateBoardDto.description !== undefined) {
      updateData.description = updateBoardDto.description || null;
    }

    if (updateBoardDto.note !== undefined) {
      updateData.note = updateBoardDto.note || null;
    }

    if (updateBoardDto.shopId !== undefined) {
      updateData.shopId = updateBoardDto.shopId || null;
    }

    if (updateBoardDto.assigneeDesignerId !== undefined) {
      updateData.assigneeDesignerId = updateBoardDto.assigneeDesignerId || null;
    }

    if (updateBoardDto.dueDate !== undefined) {
      updateData.dueDate = updateBoardDto.dueDate
        ? new Date(updateBoardDto.dueDate)
        : null;
    }

    if (updateBoardDto.priority !== undefined) {
      updateData.priority = updateBoardDto.priority || null;
    }

    // Update board
    const updatedBoard = await this.prisma.board.update({
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
        assigneeDesigner: {
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
      'board.update',
      EntityType.BOARD,
      updatedBoard.id,
      {
        updatedFields: Object.keys(updateData),
      },
    );

    return this.mapToBoardResponse(updatedBoard);
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if board exists
    const board = await this.prisma.board.findUnique({
      where: { id },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.orgId !== orgId) {
      throw new NotFoundException('Board not found');
    }

    if (board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Soft delete
    await this.prisma.board.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'board.delete',
      EntityType.BOARD,
      id,
      {
        title: board.title,
      },
    );

    return { message: 'Board deleted successfully' };
  }

  private mapToBoardResponse(
    board: Prisma.BoardGetPayload<{
      include: {
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
        assigneeDesigner: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>,
  ): BoardResponseDto {
    return {
      id: board.id,
      orgId: board.orgId,
      shopId: board.shopId,
      title: board.title,
      description: board.description,
      note: board.note,
      assigneeDesignerId: board.assigneeDesignerId,
      assigneeDesigner: board.assigneeDesigner,
      dueDate: board.dueDate,
      priority: board.priority,
      createdById: board.createdById,
      createdBy: board.createdBy,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    };
  }
}

