import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';
import {
  ActivityLogListResponseDto,
} from './dto/activity-log-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';
import { EntityType } from '@prisma/client';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT-auth')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ActivityLogsController {
  constructor(
    private readonly activityLogsService: ActivityLogsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get list of activity logs with cursor pagination',
    description: 'Retrieve activity logs with cursor-based pagination. Filters by entityType and/or entityId. Uses stable sorting by createdAt + id.',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: EntityType,
    description: 'Filter by entity type',
    example: EntityType.TASK,
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    description: 'Filter by entity ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items to return (max 100)',
    example: 20,
    type: Number,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor for pagination (base64 encoded JSON: { createdAt, id })',
    example: 'eyJjcmVhdGVkQXQiOiIyMDI1LTEyLTE0VDE1OjMyOjU0LjM3MFoiLCJpZCI6IjEyM2U0NTY3LWU4OWItMTJkMy1hNDU2LTQyNjYxNDE3NDAwMCJ9',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of activity logs retrieved successfully',
    type: ActivityLogListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid query parameters (e.g., invalid cursor)',
  })
  async findAll(
    @Query() query: ActivityLogQueryDto,
    @Req() req: UserRequest,
  ): Promise<ActivityLogListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.activityLogsService.findAll(query, orgId);
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

