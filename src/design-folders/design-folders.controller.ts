import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DesignFoldersService } from './design-folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderQueryDto } from './dto/folder-query.dto';
import { FolderResponseDto, FolderListResponseDto } from './dto/folder-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Design Folders')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DesignFoldersController {
  constructor(
    private readonly designFoldersService: DesignFoldersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('boards/:boardId/folders')
  @Permissions('FOLDER_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new design folder in a board' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Folder created successfully',
    type: FolderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board or parent folder not found' })
  async create(
    @Param('boardId') boardId: string,
    @Body() createFolderDto: CreateFolderDto,
    @Req() req: UserRequest,
  ): Promise<FolderResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.designFoldersService.create(boardId, createFolderDto, userId, orgId);
  }

  @Get('boards/:boardId/folders')
  @Permissions('FOLDER_READ')
  @ApiOperation({ summary: 'Get list of folders in a board' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of folders retrieved successfully',
    type: FolderListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findAll(
    @Param('boardId') boardId: string,
    @Query() query: FolderQueryDto,
    @Req() req: UserRequest,
  ): Promise<FolderListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.designFoldersService.findAll(boardId, query, orgId);
  }

  @Get('folders/:id')
  @Permissions('FOLDER_READ')
  @ApiOperation({ summary: 'Get folder by ID' })
  @ApiParam({
    name: 'id',
    description: 'Folder ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Folder retrieved successfully',
    type: FolderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<FolderResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.designFoldersService.findOne(id, orgId);
  }

  @Patch('folders/:id')
  @Permissions('FOLDER_UPDATE')
  @ApiOperation({ summary: 'Update folder name or move folder' })
  @ApiParam({
    name: 'id',
    description: 'Folder ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Folder updated successfully',
    type: FolderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid parent or circular reference' })
  @ApiResponse({ status: 404, description: 'Folder or parent folder not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @Req() req: UserRequest,
  ): Promise<FolderResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.designFoldersService.update(id, updateFolderDto, userId, orgId);
  }

  @Delete('folders/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('FOLDER_DELETE')
  @ApiOperation({ summary: 'Delete folder (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Folder ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Folder deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Folder deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Folder has subfolders' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.designFoldersService.remove(id, userId, orgId);
  }

  private async getUserOrgId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { orgId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.orgId;
  }
}

