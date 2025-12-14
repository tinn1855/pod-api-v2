import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionQueryDto } from './dto/permission-query.dto';
import {
  PermissionResponseDto,
  PermissionListResponseDto,
} from './dto/permission-response.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PermissionQueryDto): Promise<PermissionListResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          _count: {
            select: { roles: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.permission.count(),
    ]);

    return {
      data: permissions.map((permission) =>
        this.mapToPermissionResponse(permission),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: { roles: true },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return this.mapToPermissionResponse(permission);
  }

  private mapToPermissionResponse(permission: any): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      roles:
        permission.roles?.map((rp: any) => ({
          id: rp.role.id,
          name: rp.role.name,
        })) || [],
      roleCount: permission._count?.roles || 0,
    };
  }
}
