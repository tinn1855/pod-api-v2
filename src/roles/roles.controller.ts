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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import { RoleResponseDto, RoleListResponseDto } from './dto/role-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('ROLE_CREATE')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Role name already exists',
  })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Permissions('ROLE_READ')
  @ApiOperation({ summary: 'Get list of roles with pagination' })
  @ApiResponse({
    status: 200,
    description: 'List of roles retrieved successfully',
    type: RoleListResponseDto,
  })
  async findAll(@Query() query: RoleQueryDto): Promise<RoleListResponseDto> {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @Permissions('ROLE_READ')
  @ApiOperation({ summary: 'Get role by ID with permissions' })
  @ApiParam({
    name: 'id',
    description: 'Role ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('ROLE_UPDATE')
  @ApiOperation({ summary: 'Update role information' })
  @ApiParam({
    name: 'id',
    description: 'Role ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Role name already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Patch(':id/permissions')
  @Permissions('ROLE_UPDATE')
  @ApiOperation({
    summary: 'Assign permissions to role (replaces existing permissions)',
  })
  @ApiParam({
    name: 'id',
    description: 'Role ID (UUID)',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions assigned successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid permission IDs',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.rolesService.assignPermissions(id, assignPermissionsDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('ROLE_DELETE')
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({
    name: 'id',
    description: 'Role ID (UUID)',
    example: '926fb2dd-cab5-4390-943a-82c4a39c15ec',
  })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Role deleted successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Role has users, cannot delete',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.rolesService.remove(id);
  }
}
