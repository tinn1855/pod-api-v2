import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { ConnectConnectionDto } from './dto/connect-connection.dto';
import { ShopConnectionResponseDto } from './dto/connection-response.dto';
import { EncryptionService } from '../common/services/encryption.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PlatformAdapterService } from './adapters/platform-adapter.service';
import {
  ShopPlatform,
  ConnectionStatus,
  CredentialType,
  EntityType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ConnectionsService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private activityLogService: ActivityLogService,
    private platformAdapterService: PlatformAdapterService,
  ) {}

  /**
   * Check if user can access connection (via shop ownership or admin)
   */
  private async checkConnectionAccess(
    connectionId: string,
    userId: string,
    userRoleName: string,
  ): Promise<{ shopId: string; orgId: string }> {
    const connection = await this.prisma.shopConnection.findUnique({
      where: { id: connectionId },
      include: {
        shop: {
          select: {
            id: true,
            ownerUserId: true,
            orgId: true,
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Admin can access any connection
    if (userRoleName === 'ADMIN' || userRoleName === 'SUPER_ADMIN') {
      return { shopId: connection.shopId, orgId: connection.shop.orgId };
    }

    // Seller can only access their own shop's connections
    if (connection.shop.ownerUserId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this connection',
      );
    }

    return { shopId: connection.shopId, orgId: connection.shop.orgId };
  }

  async create(
    shopId: string,
    createConnectionDto: CreateConnectionDto,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<ShopConnectionResponseDto> {
    // Check shop access
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true, orgId: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (
      userRoleName !== 'ADMIN' &&
      userRoleName !== 'SUPER_ADMIN' &&
      shop.ownerUserId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to create connections for this shop',
      );
    }

    // Check if connection already exists for this platform
    const existing = await this.prisma.shopConnection.findUnique({
      where: {
        shopId_platform: {
          shopId,
          platform: createConnectionDto.platform,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Connection for platform ${createConnectionDto.platform} already exists for this shop`,
      );
    }

    // Create connection
    const connection = await this.prisma.shopConnection.create({
      data: {
        shopId,
        platform: createConnectionDto.platform,
        status: ConnectionStatus.DISCONNECTED,
        displayName: createConnectionDto.displayName,
        isActive: true,
        region: createConnectionDto.region,
        currency: createConnectionDto.currency,
      },
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'CREATE',
      EntityType.ACCOUNT,
      connection.id,
      {
        shopId,
        platform: createConnectionDto.platform,
      },
    );

    return this.mapToConnectionResponse(connection);
  }

  async findAll(shopId: string): Promise<ShopConnectionResponseDto[]> {
    const connections = await this.prisma.shopConnection.findMany({
      where: { shopId },
      include: {
        credential: false, // Never include credentials
      },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((conn) => this.mapToConnectionResponse(conn));
  }

  async remove(
    connectionId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<void> {
    // Check access
    await this.checkConnectionAccess(connectionId, userId, userRoleName);

    // Hard delete: cascade will delete credential
    await this.prisma.$transaction(async (tx) => {
      await tx.shopConnection.delete({
        where: { id: connectionId },
      });

      // Log activity
      await this.activityLogService.createLog(
        orgId,
        actorId,
        'DELETE',
        EntityType.ACCOUNT,
        connectionId,
        {},
      );
    });
  }

  async connect(
    connectionId: string,
    connectDto: ConnectConnectionDto,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<ShopConnectionResponseDto> {
    // Check access
    await this.checkConnectionAccess(connectionId, userId, userRoleName);

    const connection = await this.prisma.shopConnection.findUnique({
      where: { id: connectionId },
      include: { credential: true },
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // Validate OAuth access token
    if (!connectDto.accessToken || connectDto.accessToken.trim().length === 0) {
      throw new BadRequestException('Access token is required');
    }

    // Encrypt OAuth tokens
    const accessTokenEnc = this.encryptionService.encryptString(
      connectDto.accessToken,
    );
    const refreshTokenEnc = connectDto.refreshToken
      ? this.encryptionService.encryptString(connectDto.refreshToken)
      : null;

    // Determine status
    let status: ConnectionStatus = ConnectionStatus.CONNECTED;
    const expiresAt = connectDto.expiresAt
      ? new Date(connectDto.expiresAt)
      : null;

    if (expiresAt && expiresAt < new Date()) {
      status = ConnectionStatus.TOKEN_EXPIRED;
    }

    // Upsert credential
    await this.prisma.$transaction(async (tx) => {
      if (connection.credential) {
        await tx.connectionCredential.update({
          where: { connectionId },
          data: {
            type: CredentialType.OAUTH,
            accessTokenEnc,
            refreshTokenEnc,
            apiKeyEnc: null,
            expiresAt,
            scopesJson: connectDto.scopes
              ? (connectDto.scopes as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            metaJson: connectDto.meta
              ? (connectDto.meta as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });
      } else {
        await tx.connectionCredential.create({
          data: {
            connectionId,
            type: CredentialType.OAUTH,
            accessTokenEnc,
            refreshTokenEnc,
            apiKeyEnc: null,
            expiresAt,
            scopesJson: connectDto.scopes
              ? (connectDto.scopes as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            metaJson: connectDto.meta
              ? (connectDto.meta as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });
      }

      await tx.shopConnection.update({
        where: { id: connectionId },
        data: { status },
      });
    });

    // Log activity (without secrets)
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'UPDATE',
      EntityType.ACCOUNT,
      connectionId,
      {
        action: 'connect',
        platform: connection.platform,
        type: 'OAUTH',
      },
    );

    const updated = await this.prisma.shopConnection.findUnique({
      where: { id: connectionId },
      include: { credential: false },
    });

    return this.mapToConnectionResponse(updated!);
  }

  async disconnect(
    connectionId: string,
    userId: string,
    userRoleName: string,
    orgId: string,
    actorId: string,
  ): Promise<ShopConnectionResponseDto> {
    // Check access
    await this.checkConnectionAccess(connectionId, userId, userRoleName);

    await this.prisma.$transaction(async (tx) => {
      // Delete credential
      await tx.connectionCredential.deleteMany({
        where: { connectionId },
      });

      // Update connection status
      await tx.shopConnection.update({
        where: { id: connectionId },
        data: { status: ConnectionStatus.DISCONNECTED },
      });
    });

    // Log activity
    await this.activityLogService.createLog(
      orgId,
      actorId,
      'UPDATE',
      EntityType.ACCOUNT,
      connectionId,
      {
        action: 'disconnect',
      },
    );

    const connection = await this.prisma.shopConnection.findUnique({
      where: { id: connectionId },
      include: { credential: false },
    });

    return this.mapToConnectionResponse(connection!);
  }

  private mapToConnectionResponse(connection: any): ShopConnectionResponseDto {
    return {
      id: connection.id,
      shopId: connection.shopId,
      platform: connection.platform,
      status: connection.status,
      displayName: connection.displayName,
      isActive: connection.isActive,
      region: connection.region,
      currency: connection.currency,
      lastSyncAt: connection.lastSyncAt,
      lastError: connection.lastError,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}

