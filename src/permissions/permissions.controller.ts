import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { PermissionQueryDto } from './dto/permission-query.dto';
import {
  PermissionResponseDto,
  PermissionListResponseDto,
} from './dto/permission-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('PERMISSION_READ')
  @ApiOperation({ summary: 'Get list of permissions with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of permissions retrieved successfully',
    type: PermissionListResponseDto,
  })
  async findAll(
    @Query() query: PermissionQueryDto,
  ): Promise<PermissionListResponseDto> {
    return this.permissionsService.findAll(query);
  }

  @Get(':id')
  @Permissions('PERMISSION_READ')
  @ApiOperation({ summary: 'Get permission by ID with roles' })
  @ApiParam({
    name: 'id',
    description: 'Permission ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Permission retrieved successfully',
    type: PermissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Permission not found' })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }
}
