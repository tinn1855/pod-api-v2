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
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformQueryDto } from './dto/platform-query.dto';
import {
  PlatformResponseDto,
  PlatformListResponseDto,
} from './dto/platform-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import type { UserRequest } from '../common/interfaces/user-request.interface';

@ApiTags('Platforms')
@ApiBearerAuth('JWT-auth')
@Controller('platforms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('PLATFORM_CREATE')
  @ApiOperation({ summary: 'Create a new platform' })
  @ApiResponse({
    status: 201,
    description: 'Platform created successfully',
    type: PlatformResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Platform code already exists',
  })
  async create(
    @Req() req: UserRequest,
    @Body() createPlatformDto: CreatePlatformDto,
  ): Promise<PlatformResponseDto> {
    return this.platformsService.create(
      createPlatformDto,
      req.user.orgId,
      req.user.sub,
    );
  }

  @Get()
  @Permissions('PLATFORM_READ')
  @ApiOperation({
    summary: 'Get list of platforms with pagination and search',
  })
  @ApiResponse({
    status: 200,
    description: 'List of platforms retrieved successfully',
    type: PlatformListResponseDto,
  })
  async findAll(
    @Query() query: PlatformQueryDto,
  ): Promise<PlatformListResponseDto> {
    return this.platformsService.findAll(query);
  }

  @Get(':id')
  @Permissions('PLATFORM_READ')
  @ApiOperation({ summary: 'Get platform by ID' })
  @ApiParam({
    name: 'id',
    description: 'Platform ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform retrieved successfully',
    type: PlatformResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  async findOne(@Param('id') id: string): Promise<PlatformResponseDto> {
    return this.platformsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('PLATFORM_UPDATE')
  @ApiOperation({ summary: 'Update platform information' })
  @ApiParam({
    name: 'id',
    description: 'Platform ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform updated successfully',
    type: PlatformResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Platform code already exists',
  })
  async update(
    @Req() req: UserRequest,
    @Param('id') id: string,
    @Body() updatePlatformDto: UpdatePlatformDto,
  ): Promise<PlatformResponseDto> {
    return this.platformsService.update(
      id,
      updatePlatformDto,
      req.user.orgId,
      req.user.sub,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('PLATFORM_DELETE')
  @ApiOperation({ summary: 'Delete platform' })
  @ApiParam({
    name: 'id',
    description: 'Platform ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Platform deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Platform has accounts, cannot delete',
  })
  async remove(
    @Req() req: UserRequest,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.platformsService.remove(id, req.user.orgId, req.user.sub);
  }
}

