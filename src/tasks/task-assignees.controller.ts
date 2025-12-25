import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
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
import { TaskAssigneesService } from './task-assignees.service';
import { CreateTaskAssigneeDto } from './dto/create-task-assignee.dto';
import { TaskAssigneeResponseDto } from './dto/task-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Task Assignees')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaskAssigneesController {
  constructor(
    private readonly taskAssigneesService: TaskAssigneesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('tasks/:taskId/assignees')
  @Permissions('TASK_UPDATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign a user to a task' })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Task assignee created successfully',
    type: TaskAssigneeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Task assignee already exists' })
  async create(
    @Param('taskId') taskId: string,
    @Body() createDto: CreateTaskAssigneeDto,
    @Req() req: UserRequest,
  ): Promise<TaskAssigneeResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.taskAssigneesService.create(taskId, createDto, userId, orgId);
  }

  @Get('tasks/:taskId/assignees')
  @Permissions('TASK_READ')
  @ApiOperation({ summary: 'Get list of assignees for a task' })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of task assignees retrieved successfully',
    type: [TaskAssigneeResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findAll(
    @Param('taskId') taskId: string,
    @Req() req: UserRequest,
  ): Promise<TaskAssigneeResponseDto[]> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.taskAssigneesService.findAll(taskId, orgId);
  }

  @Delete('task-assignees/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('TASK_UPDATE')
  @ApiOperation({ summary: 'Remove a task assignee' })
  @ApiParam({
    name: 'id',
    description: 'Task Assignee ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task assignee deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Task assignee deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Task assignee not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.taskAssigneesService.remove(id, userId, orgId);
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

