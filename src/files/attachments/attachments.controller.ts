import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { AttachmentQueryDto } from './dto/attachment-query.dto';
import {
  AttachmentResponseDto,
  AttachmentListResponseDto,
} from './dto/attachment-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import type { UserRequest } from '../../common/interfaces/user-request.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '../../common/exceptions/http-exceptions';

@ApiTags('Attachments')
@ApiBearerAuth('JWT-auth')
@Controller('attachments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Permissions('ATTACHMENT_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create attachment (attach file to entity)' })
  @ApiResponse({
    status: 201,
    description: 'Attachment created successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File or entity not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(
    @Body() createAttachmentDto: CreateAttachmentDto,
    @Req() req: UserRequest,
  ): Promise<AttachmentResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.attachmentsService.create(createAttachmentDto, userId, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of attachments with filters' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['BOARD', 'TASK', 'DESIGN', 'FOLDER', 'CONTENT'] })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of attachments retrieved successfully',
    type: AttachmentListResponseDto,
  })
  async findAll(
    @Query() query: AttachmentQueryDto,
    @Req() req: UserRequest,
  ): Promise<AttachmentListResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.attachmentsService.findAll(query, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete attachment (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Attachment ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Attachment deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async remove(
    @Param('id') id: string,
    @Req() req: UserRequest,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.attachmentsService.remove(id, userId, orgId);
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

