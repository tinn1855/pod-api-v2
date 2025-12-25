import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileResponseDto, CreateFileResponseDto } from './dto/file-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '../common/exceptions/http-exceptions';

@ApiTags('Files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Permissions('FILE_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create file metadata record' })
  @ApiResponse({
    status: 201,
    description: 'File metadata created successfully',
    type: CreateFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file type' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(
    @Body() createFileDto: CreateFileDto,
    @Req() req: UserRequest,
  ): Promise<CreateFileResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.filesService.create(createFileDto, userId, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiParam({
    name: 'id',
    description: 'File ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'File retrieved successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async findOne(@Param('id') id: string): Promise<FileResponseDto> {
    return this.filesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file metadata (storageKey, checksum, etc.)' })
  @ApiParam({
    name: 'id',
    description: 'File ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'File updated successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
    @Req() req: UserRequest,
  ): Promise<FileResponseDto> {
    const userId = req.user.sub;
    const orgId = await this.getUserOrgId(userId);
    return this.filesService.update(id, updateFileDto, userId, orgId);
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

