import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentQueryDto } from './dto/comment-query.dto';
import {
  CommentResponseDto,
  CommentListResponseDto,
} from './dto/comment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Comments')
@ApiBearerAuth('JWT-auth')
@Controller('comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Permissions('COMMENT_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a comment',
    description: 'Create a new comment on a BOARD, TASK, DESIGN, or CONTENT entity. Requires COMMENT_CREATE permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data (e.g., invalid entityType, empty body)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: UserRequest,
  ): Promise<CommentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.commentsService.create(createCommentDto, userId, orgId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get list of comments with filters',
    description: 'Retrieve a paginated list of comments. Filters by entityType and/or entityId. Only returns non-deleted comments (deletedAt IS NULL).',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: ['BOARD', 'TASK', 'DESIGN', 'CONTENT'],
    description: 'Filter by entity type',
    example: 'TASK',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    description: 'Filter by entity ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed)',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page (max 100)',
    example: 10,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of comments retrieved successfully',
    type: CommentListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters (e.g., invalid entityType)',
  })
  async findAll(
    @Query() query: CommentQueryDto,
    @Req() req: UserRequest,
  ): Promise<CommentListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.commentsService.findAll(query, orgId);
  }

  @Patch(':id')
  @Permissions('COMMENT_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update comment',
    description: 'Update a comment by ID. Only the body can be updated. Requires COMMENT_UPDATE permission.',
  })
  @ApiParam({
    name: 'id',
    description: 'Comment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data (e.g., empty body)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Comment not found or already deleted' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: UserRequest,
  ): Promise<CommentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.commentsService.update(id, updateCommentDto, userId, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete comment (soft delete)',
    description: 'Soft delete a comment by setting deletedAt timestamp. The comment will no longer appear in list queries.',
  })
  @ApiParam({
    name: 'id',
    description: 'Comment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Comment deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Comment not found or already deleted' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.commentsService.remove(id, userId, orgId);
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

