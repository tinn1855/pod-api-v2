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
import { ActivityLogService } from '../common/services/activity-log.service';
import { Prisma, EntityType } from '@prisma/client';

@Injectable()
export class PlatformsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * Generate code from name
   * Converts name to uppercase, removes special characters, replaces spaces with underscores
   * Example: "Etsy Marketplace" -> "ETSY_MARKETPLACE"
   */
  private generateCodeFromName(name: string): string {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Generate unique code from name, handling conflicts by appending number
   */
  private async generateUniqueCode(name: string): Promise<string> {
    let baseCode = this.generateCodeFromName(name);

    // Ensure code is not empty
    if (!baseCode) {
      baseCode = 'PLATFORM';
    }

    let code = baseCode;
    let counter = 1;

    // Check if code exists, if yes, append number
    while (true) {
      const existing = await this.prisma.platform.findUnique({
        where: { code },
      });

      if (!existing) {
        break;
      }

      code = `${baseCode}_${counter}`;
      counter++;
    }

    return code;
  }

  async create(
    createPlatformDto: CreatePlatformDto,
    orgId: string,
    actorId: string,
  ): Promise<PlatformResponseDto> {
    // Auto-generate code from name
    const code = await this.generateUniqueCode(createPlatformDto.name);

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

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'CREATE',
      EntityType.PLATFORM,
      platform.id,
      {
        code: platform.code,
        name: platform.name,
      },
    );

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
    orgId: string,
    actorId: string,
  ): Promise<PlatformResponseDto> {
    const existingPlatform = await this.prisma.platform.findUnique({
      where: { id },
    });

    if (!existingPlatform) {
      throw new NotFoundException('Platform not found');
    }

    // Prepare update data
    const updateData: Prisma.PlatformUpdateInput = {};

    // If name is updated, regenerate code from new name
    if (updatePlatformDto.name !== undefined) {
      updateData.name = updatePlatformDto.name;

      // Regenerate code from new name
      const newCode = await this.generateUniqueCode(updatePlatformDto.name);
      updateData.code = newCode;
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

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'UPDATE',
      EntityType.PLATFORM,
      platform.id,
      {
        updatedFields: Object.keys(updatePlatformDto),
      },
    );

    return this.mapToPlatformResponse(platform);
  }

  async remove(
    id: string,
    orgId: string,
    actorId: string,
  ): Promise<{ message: string }> {
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

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'DELETE',
      EntityType.PLATFORM,
      platform.id,
      {
        code: platform.code,
        name: platform.name,
      },
    );

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

