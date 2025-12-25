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
import { ContentsService } from './contents.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import { ContentResponseDto, ContentListResponseDto } from './dto/content-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Contents')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ContentsController {
  constructor(
    private readonly contentsService: ContentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('boards/:boardId/contents')
  @Permissions('CONTENT_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new content in a board' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Content created successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board, shop, or account not found' })
  async create(
    @Param('boardId') boardId: string,
    @Body() createContentDto: CreateContentDto,
    @Req() req: UserRequest,
  ): Promise<ContentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.contentsService.create(boardId, createContentDto, userId, orgId);
  }

  @Get('boards/:boardId/contents')
  @Permissions('CONTENT_READ')
  @ApiOperation({ summary: 'Get list of contents in a board' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of contents retrieved successfully',
    type: ContentListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findAll(
    @Param('boardId') boardId: string,
    @Query() query: ContentQueryDto,
    @Req() req: UserRequest,
  ): Promise<ContentListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.contentsService.findAll(boardId, query, orgId);
  }

  @Get('contents/:id')
  @Permissions('CONTENT_READ')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({
    name: 'id',
    description: 'Content ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Content retrieved successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<ContentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.contentsService.findOne(id, orgId);
  }

  @Patch('contents/:id')
  @Permissions('CONTENT_UPDATE')
  @ApiOperation({ summary: 'Update content information' })
  @ApiParam({
    name: 'id',
    description: 'Content ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Content updated successfully',
    type: ContentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content, shop, or account not found' })
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
    @Req() req: UserRequest,
  ): Promise<ContentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.contentsService.update(id, updateContentDto, userId, orgId);
  }

  @Delete('contents/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('CONTENT_DELETE')
  @ApiOperation({ summary: 'Delete content (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Content ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Content deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Content deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.contentsService.remove(id, userId, orgId);
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

