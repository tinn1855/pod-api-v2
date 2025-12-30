import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopQueryDto } from './dto/shop-query.dto';
import {
  ShopResponseDto,
  ShopListResponseDto,
} from './dto/shop-response.dto';
import { ActivityLogService } from '../common/services/activity-log.service';
import { Prisma, EntityType } from '@prisma/client';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * Check if user can access shop (ownership or admin)
   */
  private async checkShopAccess(
    shopId: string,
    userId: string,
    userRoleName: string,
  ): Promise<void> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Admin can access any shop
    if (userRoleName === 'ADMIN' || userRoleName === 'SUPER_ADMIN') {
      return;
    }

    // Seller can only access their own shops
    if (shop.ownerUserId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this shop',
      );
    }
  }

  async create(
    createShopDto: CreateShopDto,
    orgId: string,
    userId: string,
    actorId: string,
  ): Promise<ShopResponseDto> {
    // Create shop
    const shop = await this.prisma.shop.create({
      data: {
        orgId,
        ownerUserId: userId,
        name: createShopDto.name,
        isActive: true,
      },
      include: {
        connections: {
          where: { isActive: true },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'CREATE',
      EntityType.SHOP,
      shop.id,
      {
        name: shop.name,
      },
    );

    return this.mapToShopResponse(shop);
  }

  async findAll(
    query: ShopQueryDto,
    orgId: string,
    userId: string,
    userRoleName: string,
  ): Promise<ShopListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ShopWhereInput = {
      orgId,
    };

    // SELLER sees only own shops
    if (userRoleName !== 'ADMIN' && userRoleName !== 'SUPER_ADMIN') {
      where.ownerUserId = userId;
    } else if (query.ownerUserId) {
      // ADMIN can filter by ownerUserId
      where.ownerUserId = query.ownerUserId;
    }

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        include: {
          connections: {
            where: { isActive: true },
            select: {
              id: true,
              platform: true,
              status: true,
              displayName: true,
              isActive: true,
              region: true,
              currency: true,
              lastSyncAt: true,
              lastError: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      data: shops.map((shop) => this.mapToShopResponse(shop)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    shopId: string,
    userId: string,
    userRoleName: string,
  ): Promise<ShopResponseDto> {
    // Check access
    await this.checkShopAccess(shopId, userId, userRoleName);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        connections: {
          include: {
            credential: false, // Never include credentials
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return this.mapToShopResponse(shop);
  }

  async update(
    shopId: string,
    updateShopDto: UpdateShopDto,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<ShopResponseDto> {
    // Check access
    await this.checkShopAccess(shopId, userId, userRoleName);

    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: updateShopDto,
      include: {
        connections: {
          where: { isActive: true },
        },
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'UPDATE',
      EntityType.SHOP,
      shop.id,
      {
        updatedFields: Object.keys(updateShopDto),
      },
    );

    return this.mapToShopResponse(shop);
  }

  async remove(
    shopId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<void> {
    // Check access
    await this.checkShopAccess(shopId, userId, userRoleName);

    // Hard delete: cascade will delete connections and credentials
    await this.prisma.$transaction(async (tx) => {
      // Delete shop (cascade deletes connections and credentials)
      await tx.shop.delete({
        where: { id: shopId },
      });

      // Log activity
      await this.activityLogService.createLog(
        orgId,
        actorId,
        'DELETE',
        EntityType.SHOP,
        shopId,
        {},
      );
    });
  }

  private mapToShopResponse(shop: any): ShopResponseDto {
    return {
      id: shop.id,
      orgId: shop.orgId,
      ownerUserId: shop.ownerUserId,
      name: shop.name,
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
      connections: shop.connections?.map((conn: any) => ({
        id: conn.id,
        shopId: conn.shopId,
        platform: conn.platform,
        status: conn.status,
        displayName: conn.displayName,
        isActive: conn.isActive,
        region: conn.region,
        currency: conn.currency,
        lastSyncAt: conn.lastSyncAt,
        lastError: conn.lastError,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
      })),
    };
  }
}

