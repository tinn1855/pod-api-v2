import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopPlatform, ConnectionStatus } from '@prisma/client';

export class ShopConnectionResponseDto {
  @ApiProperty({ description: 'Connection ID', example: 'connection-uuid' })
  id: string;

  @ApiProperty({ description: 'Shop ID', example: 'shop-uuid' })
  shopId: string;

  @ApiProperty({
    description: 'Platform type',
    enum: ShopPlatform,
    example: ShopPlatform.ETSY,
  })
  platform: ShopPlatform;

  @ApiProperty({
    description: 'Connection status',
    enum: ConnectionStatus,
    example: ConnectionStatus.DISCONNECTED,
  })
  status: ConnectionStatus;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'My Etsy Shop',
  })
  displayName?: string;

  @ApiProperty({ description: 'Whether the connection is active', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Region', example: 'US' })
  region?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD' })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Last sync timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  lastSyncAt?: Date;

  @ApiPropertyOptional({
    description: 'Last error message',
    example: 'Connection timeout',
  })
  lastError?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

