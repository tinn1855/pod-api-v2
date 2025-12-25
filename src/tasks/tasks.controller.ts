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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskResponseDto, TaskListResponseDto } from './dto/task-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('boards/:boardId/tasks')
  @Permissions('TASK_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task in a board' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async create(
    @Param('boardId') boardId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: UserRequest,
  ): Promise<TaskResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.tasksService.create(boardId, createTaskDto, userId, orgId);
  }

  @Get('boards/:boardId/tasks')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Get list of tasks in a board, grouped by column' })
  @ApiParam({
    name: 'boardId',
    description: 'Board ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tasks retrieved successfully',
    type: TaskListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Board not found' })
  async findAll(
    @Param('boardId') boardId: string,
    @Query() query: TaskQueryDto,
    @Req() req: UserRequest,
  ): Promise<TaskListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.tasksService.findAll(boardId, query, userId, orgId);
  }

  @Get('tasks/:id')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({
    name: 'id',
    description: 'Task ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<TaskResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.tasksService.findOne(id, orgId);
  }

  @Patch('tasks/:id')
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Update task information or move task (drag/drop)' })
  @ApiParam({
    name: 'id',
    description: 'Task ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid position references' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: UserRequest,
  ): Promise<TaskResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.tasksService.update(id, updateTaskDto, userId, orgId);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('TASK_DELETE')
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Task ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Task deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.tasksService.remove(id, userId, orgId);
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

