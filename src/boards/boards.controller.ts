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
  ApiQuery,
} from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { BoardQueryDto } from './dto/board-query.dto';
import { BoardResponseDto, BoardListResponseDto } from './dto/board-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Boards')
@ApiBearerAuth('JWT-auth')
@Controller('boards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Permissions('BOARD_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new board' })
  @ApiResponse({
    status: 201,
    description: 'Board created successfully',
    type: BoardResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Shop or assignee designer not found' })
  async create(
    @Body() createBoardDto: CreateBoardDto,
    @Req() req: UserRequest,
  ): Promise<BoardResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.boardsService.create(createBoardDto, userId, orgId);
  }

  @Get()
  @Permissions('BOARD_READ')
  @ApiOperation({ summary: 'Get list of boards with pagination and filters' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'createdById', required: false })
  @ApiQuery({ name: 'assigneeDesignerId', required: false })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of boards retrieved successfully',
    type: BoardListResponseDto,
  })
  async findAll(
    @Query() query: BoardQueryDto,
    @Req() req: UserRequest,
  ): Promise<BoardListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.boardsService.findAll(query, orgId);
  }

  @Get(':id')
  @Permissions('BOARD_READ')
  @ApiOperation({ summary: 'Get board by ID' })
  @ApiParam({
    name: 'id',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Board retrieved successfully',
    type: BoardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<BoardResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.boardsService.findOne(id, orgId);
  }

  @Patch(':id')
  @Permissions('BOARD_UPDATE')
  @ApiOperation({ summary: 'Update board information' })
  @ApiParam({
    name: 'id',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Board updated successfully',
    type: BoardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async update(
    @Param('id') id: string,
    @Body() updateBoardDto: UpdateBoardDto,
    @Req() req: UserRequest,
  ): Promise<BoardResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.boardsService.update(id, updateBoardDto, userId, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('BOARD_DELETE')
  @ApiOperation({ summary: 'Delete board (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Board deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Board deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.boardsService.remove(id, userId, orgId);
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

