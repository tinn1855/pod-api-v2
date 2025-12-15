import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import {
  RoleResponseDto,
  RoleListResponseDto,
} from './dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check if role name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role name already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return this.mapToRoleResponse(role);
  }

  async findAll(query: RoleQueryDto): Promise<RoleListResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: limit,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          _count: {
            select: { users: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.role.count(),
    ]);

    return {
      data: roles.map((role) => this.mapToRoleResponse(role)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.mapToRoleResponse(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }

    // Check if new name conflicts with existing role
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const conflictingRole = await this.prisma.role.findUnique({
        where: { name: updateRoleDto.name },
      });

      if (conflictingRole) {
        throw new ConflictException('Role name already exists');
      }
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return this.mapToRoleResponse(role);
  }

  async assignPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: assignPermissionsDto.permissionIds,
        },
      },
    });

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Delete existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Assign new permissions
    await this.prisma.rolePermission.createMany({
      data: assignPermissionsDto.permissionIds.map((permissionId) => ({
        roleId: id,
        permissionId,
      })),
    });

    // Return updated role
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if role has users
    if (role._count.users > 0) {
      throw new ConflictException(
        `Cannot delete role. Role has ${role._count.users} user(s). Please reassign users first.`,
      );
    }

    // Delete role permissions first
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    // Delete role
    await this.prisma.role.delete({
      where: { id },
    });

    return { message: 'Role deleted successfully' };
  }

  private mapToRoleResponse(role: any): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions?.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
      })) || [],
      userCount: role._count?.users || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
