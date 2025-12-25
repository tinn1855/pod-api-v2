import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderQueryDto } from './dto/folder-query.dto';
import {
  FolderResponseDto,
  FolderListResponseDto,
} from './dto/folder-response.dto';
import { EntityType, Prisma } from '@prisma/client';

@Injectable()
export class DesignFoldersService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  async create(
    boardId: string,
    createFolderDto: CreateFolderDto,
    userId: string,
    orgId: string,
  ): Promise<FolderResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Validate parent folder if provided
    if (createFolderDto.parentId) {
      const parentFolder = await this.prisma.designFolder.findUnique({
        where: { id: createFolderDto.parentId },
      });

      if (
        !parentFolder ||
        parentFolder.boardId !== boardId ||
        parentFolder.orgId !== orgId ||
        parentFolder.deletedAt !== null
      ) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    // Create folder
    const folder = await this.prisma.designFolder.create({
      data: {
        orgId,
        boardId,
        name: createFolderDto.name,
        parentId: createFolderDto.parentId || null,
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
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'folder.create',
      EntityType.FOLDER,
      folder.id,
      {
        name: folder.name,
        boardId: folder.boardId,
        parentId: folder.parentId,
      },
    );

    return this.mapToFolderResponse(folder);
  }

  async findAll(
    boardId: string,
    query: FolderQueryDto,
    orgId: string,
  ): Promise<FolderListResponseDto> {
    // Validate board exists and belongs to org
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board || board.orgId !== orgId || board.deletedAt !== null) {
      throw new NotFoundException('Board not found');
    }

    // Build where clause
    const where: Prisma.DesignFolderWhereInput = {
      boardId,
      deletedAt: null,
    };

    // Filter by parentId (if not provided, returns root-level folders where parentId is null)
    if (query.parentId !== undefined) {
      where.parentId = query.parentId || null;
    } else {
      where.parentId = null; // Default to root-level folders
    }

    // Fetch folders
    const folders = await this.prisma.designFolder.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      data: folders.map((folder) => this.mapToFolderResponse(folder)),
    };
  }

  async findOne(id: string, orgId: string): Promise<FolderResponseDto> {
    const folder = await this.prisma.designFolder.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.orgId !== orgId) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.deletedAt !== null) {
      throw new NotFoundException('Folder not found');
    }

    return this.mapToFolderResponse(folder);
  }

  async update(
    id: string,
    updateFolderDto: UpdateFolderDto,
    userId: string,
    orgId: string,
  ): Promise<FolderResponseDto> {
    // Check if folder exists
    const existingFolder = await this.prisma.designFolder.findUnique({
      where: { id },
    });

    if (!existingFolder) {
      throw new NotFoundException('Folder not found');
    }

    if (existingFolder.orgId !== orgId) {
      throw new NotFoundException('Folder not found');
    }

    if (existingFolder.deletedAt !== null) {
      throw new NotFoundException('Folder not found');
    }

    // Prepare update data
    const updateData: Prisma.DesignFolderUncheckedUpdateInput = {};

    if (updateFolderDto.name !== undefined) {
      updateData.name = updateFolderDto.name;
    }

    // Handle parentId update (move folder)
    if (updateFolderDto.parentId !== undefined) {
      const newParentId = updateFolderDto.parentId;

      // Prevent moving folder into itself
      if (newParentId === id) {
        throw new BadRequestException('Cannot move folder into itself');
      }

      // Validate parent folder if provided
      if (newParentId) {
        const parentFolder = await this.prisma.designFolder.findUnique({
          where: { id: newParentId },
        });

        if (
          !parentFolder ||
          parentFolder.boardId !== existingFolder.boardId ||
          parentFolder.orgId !== orgId ||
          parentFolder.deletedAt !== null
        ) {
          throw new NotFoundException('Parent folder not found');
        }

        // Prevent circular reference: check if new parent is a descendant of current folder
        const isDescendant = await this.isDescendant(
          newParentId,
          existingFolder.id,
        );
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot move folder into its own descendant',
          );
        }
      }

      updateData.parentId = newParentId || null;
    }

    // Update folder
    const updatedFolder = await this.prisma.designFolder.update({
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
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'folder.update',
      EntityType.FOLDER,
      updatedFolder.id,
      {
        updatedFields: Object.keys(updateData),
        name: updatedFolder.name,
        parentId: updatedFolder.parentId,
      },
    );

    return this.mapToFolderResponse(updatedFolder);
  }

  async remove(id: string, userId: string, orgId: string): Promise<{ message: string }> {
    // Check if folder exists
    const folder = await this.prisma.designFolder.findUnique({
      where: { id },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.orgId !== orgId) {
      throw new NotFoundException('Folder not found');
    }

    if (folder.deletedAt !== null) {
      throw new NotFoundException('Folder not found');
    }

    // Check if folder has children
    const childrenCount = await this.prisma.designFolder.count({
      where: {
        parentId: id,
        deletedAt: null,
      },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete folder with subfolders. Please delete or move subfolders first.',
      );
    }

    // Soft delete
    await this.prisma.designFolder.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      userId,
      'folder.delete',
      EntityType.FOLDER,
      id,
      {
        name: folder.name,
        boardId: folder.boardId,
      },
    );

    return { message: 'Folder deleted successfully' };
  }

  /**
   * Check if a folder is a descendant of another folder
   * Used to prevent circular references when moving folders
   */
  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    let currentId: string | null = potentialDescendantId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      if (currentId === ancestorId) {
        return true;
      }

      const folder = await this.prisma.designFolder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!folder || !folder.parentId) {
        break;
      }

      currentId = folder.parentId;
    }

    return false;
  }

  private mapToFolderResponse(
    folder: Prisma.DesignFolderGetPayload<{
      include: {
        createdBy: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
        _count: {
          select: {
            children: true;
          };
        };
      };
    }>,
  ): FolderResponseDto {
    return {
      id: folder.id,
      orgId: folder.orgId,
      boardId: folder.boardId,
      parentId: folder.parentId,
      name: folder.name,
      createdById: folder.createdById,
      createdBy: folder.createdBy,
      childrenCount: folder._count.children,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}

