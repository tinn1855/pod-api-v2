import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformQueryDto } from './dto/platform-query.dto';
import {
  PlatformResponseDto,
  PlatformListResponseDto,
} from './dto/platform-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlatformsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPlatformDto: CreatePlatformDto,
  ): Promise<PlatformResponseDto> {
    // Normalize code to uppercase
    const code = createPlatformDto.code.toUpperCase();

    // Check if platform code already exists
    const existingPlatform = await this.prisma.platform.findUnique({
      where: { code },
    });

    if (existingPlatform) {
      throw new ConflictException(`Platform with code '${code}' already exists`);
    }

    // Create platform
    const platform = await this.prisma.platform.create({
      data: {
        code,
        name: createPlatformDto.name,
      },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    return this.mapToPlatformResponse(platform);
  }

  async findAll(query: PlatformQueryDto): Promise<PlatformListResponseDto> {
    const { q, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Build where clause for search
    const where: Prisma.PlatformWhereInput = {};

    if (q) {
      where.OR = [
        { code: { contains: q.toUpperCase(), mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [platforms, total] = await Promise.all([
      this.prisma.platform.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { accounts: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.platform.count({ where }),
    ]);

    return {
      data: platforms.map((platform) =>
        this.mapToPlatformResponse(platform),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PlatformResponseDto> {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    return this.mapToPlatformResponse(platform);
  }

  async update(
    id: string,
    updatePlatformDto: UpdatePlatformDto,
  ): Promise<PlatformResponseDto> {
    const existingPlatform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!existingPlatform) {
      throw new NotFoundException('Platform not found');
    }

    // Prepare update data
    const updateData: Prisma.PlatformUpdateInput = {};

    if (updatePlatformDto.code !== undefined) {
      const code = updatePlatformDto.code.toUpperCase();

      // Check if new code conflicts with existing platform
      if (code !== existingPlatform.code) {
        const conflictingPlatform = await this.prisma.platform.findUnique({
          where: { code },
        });

        if (conflictingPlatform) {
          throw new ConflictException(
            `Platform with code '${code}' already exists`,
          );
        }
      }

      updateData.code = code;
    }

    if (updatePlatformDto.name !== undefined) {
      updateData.name = updatePlatformDto.name;
    }

    // Update platform
    const platform = await this.prisma.platform.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    return this.mapToPlatformResponse(platform);
  }

  async remove(id: string): Promise<{ message: string }> {
    const platform = await this.prisma.platform.findUnique({
      where: { id },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    if (!platform) {
      throw new NotFoundException('Platform not found');
    }

    // Check if platform has accounts
    if (platform._count.accounts > 0) {
      throw new ConflictException(
        `Cannot delete platform. Platform has ${platform._count.accounts} account(s). Please remove or reassign accounts first.`,
      );
    }

    await this.prisma.platform.delete({
      where: { id },
    });

    return { message: 'Platform deleted successfully' };
  }

  private mapToPlatformResponse(platform: any): PlatformResponseDto {
    return {
      id: platform.id,
      code: platform.code,
      name: platform.name,
      accountCount: platform._count?.accounts || 0,
      createdAt: platform.createdAt,
      updatedAt: platform.updatedAt,
    };
  }
}

